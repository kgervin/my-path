"""Flag endpoints: student detail and coach actions."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body

from my_path.api.dependencies import RepositoryDep, ReviewServiceDep
from my_path.api.schemas import (
    ActionIn,
    ApproveIn,
    DismissIn,
    FlagDetailOut,
    RedraftIn,
    RouteIn,
)
from my_path.domain.errors import NotFoundError
from my_path.domain.models import Route, Tone
from my_path.services.review import Action, ReviewCommand

router = APIRouter(prefix="/flags", tags=["flags"])


def to_command(body: ActionIn) -> ReviewCommand:
    redraft = body if isinstance(body, RedraftIn) else None
    return ReviewCommand(
        action=Action(body.action),
        coach=body.coach,
        expected_version=body.version,
        message=body.message if isinstance(body, ApproveIn) else None,
        reason=body.reason if isinstance(body, DismissIn) else None,
        route_to=Route(body.route_to) if isinstance(body, RouteIn) else None,
        language=redraft.language if redraft else None,
        tone=redraft.tone if redraft else Tone.WARM,
    )


@router.get("/{flag_id}")
async def get_flag(flag_id: str, repo: RepositoryDep) -> FlagDetailOut:
    flag = await repo.get_flag(flag_id, with_actions=True)
    if flag is None:
        raise NotFoundError(f"No flagged student with id {flag_id}.")
    return FlagDetailOut.model_validate(flag)


@router.post("/{flag_id}/actions")
async def act_on_flag(
    flag_id: str, body: Annotated[ActionIn, Body()], review: ReviewServiceDep
) -> FlagDetailOut:
    flag = await review.act(flag_id, to_command(body))
    return FlagDetailOut.model_validate(flag)
