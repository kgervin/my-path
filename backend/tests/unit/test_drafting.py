from __future__ import annotations

import itertools
from dataclasses import replace
from datetime import date
from types import SimpleNamespace
from typing import Any

import anthropic
import httpx2
import pytest

from my_path.domain.models import (
    Assessment,
    Barrier,
    Draft,
    DraftSource,
    Language,
    Tone,
)
from my_path.domain.rules import RuleContext
from my_path.services.drafting.anthropic_drafter import AnthropicDrafter, build_prompt_input
from my_path.services.drafting.base import DraftingError
from my_path.services.drafting.guardrails import (
    check_draft,
    check_message,
    grade_level,
    word_count,
)
from my_path.services.drafting.service import DraftingService
from my_path.services.drafting.template_drafter import TemplateDrafter
from my_path.services.drafting.templates import explanation, template_draft
from tests.conftest import make_assessment

BARRIER_OVERRIDES: dict[Barrier, dict[str, object]] = {
    Barrier.SMALL_BALANCE: {"balance_usd": 280.0},
    Barrier.REGISTRATION_HOLD: {"hold_codes": ("BURSAR_HOLD",)},
    Barrier.FAILED_PAYMENT: {"last_payment_status": "failed"},
    Barrier.MISSING_AID_DOCUMENT: {"aid_items_missing": ("tax_transcript",)},
    Barrier.SILENT_STUDENT: {"last_lms_login": None},
    Barrier.NOT_REGISTERED_NEXT_TERM: {"next_term_credits": 0},
}


@pytest.fixture
def assessment(ctx: RuleContext) -> Assessment:
    return make_assessment(ctx, last_payment_status="failed", hold_codes=("BURSAR_HOLD",))


# --- guardrails -------------------------------------------------------------------------


def test_word_count_and_grade_level() -> None:
    assert word_count("Hi Maria, it's me.") == 4
    assert grade_level("") == 0.0
    assert grade_level("The cat sat. The dog ran.") < 2
    assert (
        grade_level("Institutional reconciliation necessitates comprehensive documentation.") > 12
    )


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("", "empty"),
        ("Hi Sam, pay now.", "first name"),
        ("Hi Maria, you are at risk.", "at risk"),
        ("Hi Maria, " + "word " * 130, "under 120"),
        ("Hi Maria, institutional reconciliation necessitates documentation.", "Reading level"),
    ],
)
def test_check_message_violations(message: str, expected: str) -> None:
    result = check_message(message, "Maria", Language.EN)
    assert not result.ok
    assert any(expected in v for v in result.violations)


def test_spanish_skips_english_readability_formula() -> None:
    message = "Hola Maria: la documentación institucional necesita reconciliación."
    assert check_message(message, "Maria", Language.ES).ok


def test_check_draft_rejects_unflagged_or_missing_fields(assessment: Assessment) -> None:
    good = template_draft(assessment)
    assert check_draft(good, assessment).ok
    bad_fields = replace(good, fields_used=("ssn",))
    assert "ssn" in check_draft(bad_fields, assessment).violations[0]
    no_fields = replace(good, fields_used=(), explanation=" ")
    assert len(check_draft(no_fields, assessment).violations) == 2


# --- templates --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("barrier", "language", "tone"),
    list(itertools.product(Barrier, Language, Tone)),
)
def test_every_template_passes_guardrails(
    ctx: RuleContext, barrier: Barrier, language: Language, tone: Tone
) -> None:
    assessment = make_assessment(ctx, **BARRIER_OVERRIDES[barrier])
    draft = template_draft(assessment, language, tone)
    assert check_draft(draft, assessment).ok, check_draft(draft, assessment).violations
    assert draft.source is DraftSource.TEMPLATE


def test_explanation_cites_fields_and_days(assessment: Assessment) -> None:
    text = explanation(assessment)
    assert "(last_payment_status)" in text
    assert "(hold_codes)" in text
    assert "9 days away" in text


def test_explanation_handles_past_drop_date(ctx: RuleContext) -> None:
    late = make_assessment(ctx, hold_codes=("H",), drop_date=date(2026, 9, 20))
    assert "2 days ago" in explanation(late)


def test_template_asks_for_one_action_by_priority(assessment: Assessment) -> None:
    message = template_draft(assessment).message
    assert "payment method" in message
    assert "hold" not in message


def test_template_uses_preferred_language(ctx: RuleContext) -> None:
    draft = template_draft(make_assessment(ctx, hold_codes=("H",), preferred_language=Language.ES))
    assert draft.message.startswith("Hola Maria")


# --- drafting service -------------------------------------------------------------------


class _StaticDrafter:
    name = "static"

    def __init__(self, draft: Draft | None = None, error: Exception | None = None) -> None:
        self._draft = draft
        self._error = error

    async def draft(self, assessment: Assessment, language: Language, tone: Tone) -> Draft:
        if self._error:
            raise self._error
        assert self._draft is not None
        return self._draft


async def test_service_returns_valid_ai_draft(assessment: Assessment) -> None:
    ai = replace(template_draft(assessment), source=DraftSource.AI)
    result = await DraftingService(_StaticDrafter(ai)).draft(assessment)
    assert result.source is DraftSource.AI


async def test_service_falls_back_when_guardrails_fail(assessment: Assessment) -> None:
    ai = replace(template_draft(assessment), source=DraftSource.AI, message="Hi, you are at risk")
    result = await DraftingService(_StaticDrafter(ai)).draft(assessment)
    assert result.source is DraftSource.TEMPLATE


async def test_service_falls_back_when_drafter_errors(assessment: Assessment) -> None:
    service = DraftingService(_StaticDrafter(error=DraftingError("boom")))
    result = await service.draft(assessment, Language.ES, Tone.BRIEF)
    assert result.source is DraftSource.TEMPLATE
    assert result.language is Language.ES


async def test_template_drafter_adapter(assessment: Assessment) -> None:
    draft = await TemplateDrafter().draft(assessment, Language.EN, Tone.WARM)
    assert draft == template_draft(assessment, Language.EN, Tone.WARM)


# --- anthropic drafter ------------------------------------------------------------------


class _FakeMessages:
    def __init__(self, response: Any = None, error: Exception | None = None) -> None:
        self.response = response
        self.error = error
        self.calls: list[dict[str, Any]] = []

    async def create(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.response


def _response(text: str, stop_reason: str = "end_turn") -> SimpleNamespace:
    return SimpleNamespace(
        stop_reason=stop_reason, content=[SimpleNamespace(type="text", text=text)]
    )


def _drafter(messages: _FakeMessages) -> AnthropicDrafter:
    client = SimpleNamespace(messages=messages)
    return AnthropicDrafter(client, "claude-opus-5")  # type: ignore[arg-type]


async def test_anthropic_drafter_sends_only_flagged_fields(assessment: Assessment) -> None:
    body = (
        '{"explanation": "Maria has a failed payment (last_payment_status).",'
        ' "draft_message": "Hi Maria, please update your card.",'
        ' "fields_used": ["last_payment_status"]}'
    )
    messages = _FakeMessages(_response(body))
    draft = await _drafter(messages).draft(assessment, Language.EN, Tone.WARM)

    assert draft.source is DraftSource.AI
    assert draft.fields_used == ("last_payment_status",)
    call = messages.calls[0]
    assert call["model"] == "claude-opus-5"
    assert call["output_config"]["format"]["type"] == "json_schema"
    sent = call["messages"][0]["content"]
    assert "first_gen" not in sent
    assert "program" not in sent


def test_prompt_input_names_primary_action(assessment: Assessment) -> None:
    payload = build_prompt_input(assessment, Language.EN, Tone.WARM)
    assert payload["primary_action_barrier"] == "failed_payment"
    assert set(payload["source_fields"]) == {"drop_date", "last_payment_status", "hold_codes"}


@pytest.mark.parametrize(
    ("messages", "match"),
    [
        (_FakeMessages(_response("not json")), "schema validation"),
        (_FakeMessages(_response("{}", stop_reason="refusal")), "stop_reason"),
        (
            _FakeMessages(
                error=anthropic.APIConnectionError(
                    request=httpx2.Request("POST", "https://api.test")
                )
            ),
            "APIConnectionError",
        ),
    ],
)
async def test_anthropic_drafter_errors(
    assessment: Assessment, messages: _FakeMessages, match: str
) -> None:
    with pytest.raises(DraftingError, match=match):
        await _drafter(messages).draft(assessment, Language.EN, Tone.WARM)
