"""Deterministic template drafts. Used when no LLM is configured and as the LLM fallback."""

from __future__ import annotations

from collections.abc import Callable

from my_path.domain.models import (
    Assessment,
    Barrier,
    BarrierFinding,
    Draft,
    DraftSource,
    Language,
    Tone,
)

# When a student has several barriers, the outreach asks for one action: the first match here.
ACTION_PRIORITY: tuple[Barrier, ...] = (
    Barrier.FAILED_PAYMENT,
    Barrier.SMALL_BALANCE,
    Barrier.REGISTRATION_HOLD,
    Barrier.MISSING_AID_DOCUMENT,
    Barrier.NOT_REGISTERED_NEXT_TERM,
    Barrier.SILENT_STUDENT,
)

_EXPLAIN: dict[Barrier, Callable[[dict[str, str]], str]] = {
    Barrier.SMALL_BALANCE: lambda f: f"an unpaid balance of ${f['balance_usd']} (balance_usd)",
    Barrier.REGISTRATION_HOLD: lambda f: f"an active hold {f['hold_codes']} (hold_codes)",
    Barrier.FAILED_PAYMENT: lambda _: "a failed last payment (last_payment_status)",
    Barrier.MISSING_AID_DOCUMENT: lambda f: (
        f"an outstanding aid item {f['aid_items_missing']} (aid_items_missing)"
    ),
    Barrier.SILENT_STUDENT: lambda f: (
        f"no course login since {f['last_lms_login']} (last_lms_login)"
    ),
    Barrier.NOT_REGISTERED_NEXT_TERM: lambda _: "no credits for next term (next_term_credits)",
}

_ACTION: dict[Language, dict[Barrier, str]] = {
    Language.EN: {
        Barrier.FAILED_PAYMENT: "Your last payment did not go through. Please update your "
        "payment method in My ASU.",
        Barrier.SMALL_BALANCE: "You have a small balance left. A payment plan can split it "
        "into smaller parts. You can set one up in My ASU.",
        Barrier.REGISTRATION_HOLD: "There is a hold on your account. I can explain what it is "
        "and help you clear it.",
        Barrier.MISSING_AID_DOCUMENT: "Your aid office still needs one form from you. Please "
        "send it through My ASU so your aid can pay.",
        Barrier.NOT_REGISTERED_NEXT_TERM: "Sign up for next term is open. Please pick your "
        "classes, or book a time with your advisor.",
        Barrier.SILENT_STUDENT: "I have not seen you in class for a bit. How are things going?",
    },
    Language.ES: {
        Barrier.FAILED_PAYMENT: "Tu último pago no se completó. Por favor actualiza tu método "
        "de pago en My ASU.",
        Barrier.SMALL_BALANCE: "Te queda un saldo pequeño. Un plan de pagos puede dividirlo "
        "en partes. Puedes crearlo en My ASU.",
        Barrier.REGISTRATION_HOLD: "Hay un bloqueo en tu cuenta. Puedo explicarte qué es y "
        "ayudarte a quitarlo.",
        Barrier.MISSING_AID_DOCUMENT: "La oficina de ayuda necesita un formulario tuyo. Por "
        "favor envíalo en My ASU para recibir tu ayuda.",
        Barrier.NOT_REGISTERED_NEXT_TERM: "La inscripción para el próximo término está abierta. "
        "Elige tus clases o haz una cita con tu asesor.",
        Barrier.SILENT_STUDENT: "No te he visto en clase por unos días. ¿Cómo va todo?",
    },
}

_GREETING = {Language.EN: "Hi {name},", Language.ES: "Hola {name}:"}
_DEADLINE = {
    Language.EN: "Please take care of this by {date} so you can stay in your classes.",
    Language.ES: "Por favor resuélvelo antes del {date} para seguir en tus clases.",
}
_WARM_CLOSE = {
    Language.EN: "Just reply to this message and I will help. You've got this!",
    Language.ES: "Responde a este mensaje y te ayudo. ¡Tú puedes!",
}
_SIGNATURE = {Language.EN: "Your success coach", Language.ES: "Tu coach de éxito"}


def primary_finding(assessment: Assessment) -> BarrierFinding:
    by_barrier = {f.barrier: f for f in assessment.findings}
    return next(by_barrier[b] for b in ACTION_PRIORITY if b in by_barrier)


def explanation(assessment: Assessment) -> str:
    parts = [_EXPLAIN[f.barrier](f.source_fields) for f in assessment.findings]
    joined = parts[0] if len(parts) == 1 else ", ".join(parts[:-1]) + f" and {parts[-1]}"
    days = assessment.days_to_drop
    when = f"{days} days away" if days >= 0 else f"{-days} days ago"
    return (
        f"{assessment.record.first_name} has {joined}; the drop date is "
        f"{assessment.record.drop_date.isoformat()} (drop_date, {when})."
    )


def template_draft(
    assessment: Assessment, language: Language | None = None, tone: Tone = Tone.WARM
) -> Draft:
    lang = language or assessment.record.preferred_language
    record = assessment.record
    lines = [
        _GREETING[lang].format(name=record.first_name),
        _ACTION[lang][primary_finding(assessment).barrier],
        _DEADLINE[lang].format(date=record.drop_date.strftime("%m/%d")),
    ]
    if tone is Tone.WARM:
        lines.append(_WARM_CLOSE[lang])
    lines.append(_SIGNATURE[lang])
    return Draft(
        explanation=explanation(assessment),
        message="\n\n".join(lines),
        source=DraftSource.TEMPLATE,
        language=lang,
        fields_used=tuple(assessment.source_fields),
    )
