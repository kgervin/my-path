"""Guardrails every outreach draft must pass before a coach sees it (FR-4 + PRD guardrails)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from my_path.domain.models import Assessment, Draft, Language

MAX_WORDS = 120
MAX_GRADE_LEVEL = 8.0

# Shaming or risk-score language never appears in student-facing text.
BANNED_PHRASES: tuple[str, ...] = (
    "at risk",
    "at-risk",
    "risk score",
    "dropout",
    "drop out",
    "delinquent",
    "failure to",
    "you failed",
    "lazy",
    "irresponsible",
    "final warning",
    "en riesgo",
    "puntuación de riesgo",
    "moroso",
)

_WORD = re.compile(r"[A-Za-zÀ-ÿ']+")
_SENTENCE_END = re.compile(r"[.!?]+")
_VOWEL_GROUPS = re.compile(r"[aeiouy]+")


@dataclass(frozen=True, slots=True)
class GuardrailResult:
    violations: tuple[str, ...]

    @property
    def ok(self) -> bool:
        return not self.violations


def word_count(text: str) -> int:
    return len(_WORD.findall(text))


def _syllables(word: str) -> int:
    word = word.lower()
    count = len(_VOWEL_GROUPS.findall(word))
    if word.endswith("e") and not word.endswith(("le", "ee")) and count > 1:
        count -= 1
    return max(count, 1)


def grade_level(text: str) -> float:
    """Flesch-Kincaid grade level. Only meaningful for English text."""
    words = _WORD.findall(text)
    if not words:
        return 0.0
    sentences = max(len([s for s in _SENTENCE_END.split(text) if s.strip()]), 1)
    syllables = sum(_syllables(w) for w in words)
    return 0.39 * (len(words) / sentences) + 11.8 * (syllables / len(words)) - 15.59


def check_message(message: str, first_name: str, language: Language) -> GuardrailResult:
    violations: list[str] = []
    if not message.strip():
        violations.append("Message is empty.")
    if word_count(message) >= MAX_WORDS:
        violations.append(f"Message must be under {MAX_WORDS} words.")
    if first_name.lower() not in message.lower():
        violations.append("Message should greet the student by first name.")
    lowered = message.lower()
    violations.extend(f"Avoid the phrase '{p}'." for p in BANNED_PHRASES if p in lowered)
    if language is Language.EN and grade_level(message) > MAX_GRADE_LEVEL:
        violations.append(f"Reading level should be grade {MAX_GRADE_LEVEL:.0f} or below.")
    return GuardrailResult(tuple(violations))


def check_draft(draft: Draft, assessment: Assessment) -> GuardrailResult:
    """Validate a full draft, including that it only cites fields the rules flagged."""
    result = check_message(draft.message, assessment.record.first_name, draft.language)
    violations = list(result.violations)
    allowed = set(assessment.source_fields)
    unknown = [f for f in draft.fields_used if f not in allowed]
    if unknown:
        violations.append(f"Explanation cites fields that were not flagged: {', '.join(unknown)}.")
    if not draft.fields_used:
        violations.append("Explanation must cite at least one source field.")
    if not draft.explanation.strip():
        violations.append("Explanation is empty.")
    return GuardrailResult(tuple(violations))
