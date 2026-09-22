"""Claude-backed drafter. One call per flagged student, schema-constrained JSON output.

Prompt contract (PRD): input is the flagged fields only, never free text; output must cite only
those fields, name one action and stay under 120 words. Validation happens in the service layer.
"""

from __future__ import annotations

import json
from typing import Any

import anthropic
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from my_path.domain.models import Assessment, Draft, DraftSource, Language, Tone
from my_path.services.drafting.base import DraftingError
from my_path.services.drafting.templates import primary_finding

SYSTEM_PROMPT = """\
You help a university success coach write short outreach to an online adult learner.
The rules engine has already decided which barriers apply. You never decide eligibility,
money amounts or deadlines; you only explain and draft.

Return JSON with:
- explanation: ONE plain sentence for the coach naming each barrier and citing the source
  field names in parentheses, e.g. "(balance_usd)".
- draft_message: the message to the student. Greet them by first name. Ask for exactly ONE
  action (the primary_action_barrier). Under 120 words. Grade 8 reading level or lower:
  short sentences, common words. Warm, respectful coach voice. No shame, no blame, never
  mention risk, scores or dropping out. Sign off as "Your success coach" (or
  "Tu coach de éxito" in Spanish).
- fields_used: the exact field names you relied on. Use only names present in source_fields.

Coach voice examples:
"Hi Sam, your last payment did not go through. Please update your payment method in My ASU
by 10/01 so you can stay in your classes. Just reply and I will help. Your success coach"
"Hola Ana: la oficina de ayuda necesita un formulario tuyo. Por favor envíalo en My ASU
antes del 10/01. Responde y te ayudo. Tu coach de éxito"
"""


class _DraftPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    explanation: str = Field(min_length=1)
    draft_message: str = Field(min_length=1)
    fields_used: list[str]


_OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "explanation": {"type": "string"},
        "draft_message": {"type": "string"},
        "fields_used": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["explanation", "draft_message", "fields_used"],
    "additionalProperties": False,
}


def build_prompt_input(assessment: Assessment, language: Language, tone: Tone) -> dict[str, Any]:
    """Structured, minimal input: only the fields the rules flagged."""
    return {
        "first_name": assessment.record.first_name,
        "language": language.value,
        "tone": tone.value,
        "days_to_drop": assessment.days_to_drop,
        "barriers": [b.value for b in assessment.barriers],
        "primary_action_barrier": primary_finding(assessment).barrier.value,
        "source_fields": assessment.source_fields,
    }


class AnthropicDrafter:
    name = "anthropic"

    def __init__(self, client: anthropic.AsyncAnthropic, model: str) -> None:
        self._client = client
        self._model = model

    async def draft(self, assessment: Assessment, language: Language, tone: Tone) -> Draft:
        payload = json.dumps(build_prompt_input(assessment, language, tone), sort_keys=True)
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": payload}],
                output_config={
                    "effort": "low",
                    "format": {"type": "json_schema", "schema": _OUTPUT_SCHEMA},
                },
            )
        except (anthropic.APIConnectionError, anthropic.APIStatusError) as exc:
            raise DraftingError(f"Claude request failed: {exc.__class__.__name__}") from exc

        if response.stop_reason != "end_turn":
            raise DraftingError(f"Unexpected stop_reason: {response.stop_reason}")
        text = "".join(block.text for block in response.content if block.type == "text")
        try:
            parsed = _DraftPayload.model_validate_json(text)
        except ValidationError as exc:
            raise DraftingError("Claude returned JSON that failed schema validation") from exc

        return Draft(
            explanation=parsed.explanation.strip(),
            message=parsed.draft_message.strip(),
            source=DraftSource.AI,
            language=language,
            fields_used=tuple(parsed.fields_used),
        )
