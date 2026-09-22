"""Coach review workflow (FR-6, FR-8, FR-9).

A human approves every message; nothing is sent. Every decision is written to the action log
with before/after text, and every decision can be undone with ``reopen``.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from my_path.core.metrics import COACH_ACTIONS
from my_path.domain.errors import ConflictError, InvalidActionError, NotFoundError
from my_path.domain.models import FlagStatus, Language, Route, Tone
from my_path.persistence.mappers import assessment_from_row
from my_path.persistence.repository import Repository
from my_path.persistence.tables import ActionLogRow, FlagRow
from my_path.services.drafting.guardrails import MAX_WORDS, word_count
from my_path.services.drafting.service import DraftingService


class Action(StrEnum):
    APPROVE = "approve"
    DISMISS = "dismiss"
    ROUTE = "route"
    REOPEN = "reopen"
    REDRAFT = "redraft"


ROUTABLE_TARGETS: frozenset[Route] = frozenset({Route.BURSAR, Route.AID_OFFICE})
_OPEN = frozenset({FlagStatus.NEW})
_DECIDED = frozenset(
    {FlagStatus.APPROVED, FlagStatus.EDITED, FlagStatus.DISMISSED, FlagStatus.ROUTED}
)


@dataclass(frozen=True, slots=True)
class ReviewCommand:
    action: Action
    coach: str
    expected_version: int
    message: str | None = None
    reason: str | None = None
    route_to: Route | None = None
    language: Language | None = None
    tone: Tone = Tone.WARM


class ReviewService:
    def __init__(self, repo: Repository, drafting: DraftingService) -> None:
        self._repo = repo
        self._drafting = drafting

    async def act(self, flag_id: str, cmd: ReviewCommand) -> FlagRow:
        flag = await self._repo.get_flag(flag_id, with_actions=True)
        if flag is None:
            raise NotFoundError(f"No flagged student with id {flag_id}.")
        if flag.version != cmd.expected_version:
            raise ConflictError(
                "Another coach updated this student while you were working. "
                "Reload to see the latest version."
            )
        before = flag.draft_message
        await self._apply(flag, cmd)
        flag.actions.append(
            ActionLogRow(
                action=cmd.action.value,
                coach=cmd.coach,
                before_text=before,
                after_text=flag.draft_message,
                reason=cmd.reason or (cmd.route_to.value if cmd.route_to else None),
            )
        )
        await self._repo.commit()
        COACH_ACTIONS.labels(cmd.action.value).inc()
        return flag

    async def _apply(self, flag: FlagRow, cmd: ReviewCommand) -> None:
        status = FlagStatus(flag.status)
        match cmd.action:
            case Action.APPROVE:
                _require(status, _OPEN, "approve")
                self._approve(flag, cmd.message)
            case Action.DISMISS:
                _require(status, _OPEN, "dismiss")
                if not (cmd.reason and cmd.reason.strip()):
                    raise InvalidActionError("Add a short reason so the team knows why.")
                flag.status = FlagStatus.DISMISSED.value
                flag.dismiss_reason = cmd.reason.strip()
            case Action.ROUTE:
                _require(status, _OPEN, "route")
                if cmd.route_to not in ROUTABLE_TARGETS:
                    raise InvalidActionError("Choose the bursar or the aid office.")
                flag.status = FlagStatus.ROUTED.value
                flag.routed_to = cmd.route_to.value
            case Action.REOPEN:
                _require(status, _DECIDED, "reopen")
                flag.status = FlagStatus.NEW.value
                flag.dismiss_reason = None
                flag.routed_to = None
            case Action.REDRAFT:
                _require(status, _OPEN, "redraft")
                draft = await self._drafting.draft(
                    assessment_from_row(flag), cmd.language, cmd.tone
                )
                flag.draft_message = draft.message
                flag.original_draft = draft.message
                flag.draft_language = draft.language.value
                flag.draft_source = draft.source.value

    @staticmethod
    def _approve(flag: FlagRow, message: str | None) -> None:
        final = (message if message is not None else flag.draft_message or "").strip()
        if not final:
            raise InvalidActionError("The message is empty. Write or restore a draft first.")
        if word_count(final) >= MAX_WORDS:
            raise InvalidActionError(f"Keep the message under {MAX_WORDS} words.")
        edited = final != (flag.original_draft or "").strip()
        flag.draft_message = final
        flag.status = (FlagStatus.EDITED if edited else FlagStatus.APPROVED).value


def _require(status: FlagStatus, allowed: frozenset[FlagStatus], verb: str) -> None:
    if status not in allowed:
        raise InvalidActionError(f"Can't {verb} a student whose status is '{status.value}'.")
