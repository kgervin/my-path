"""Public API contracts (v1). Changing a field here is an API change: version accordingly."""

from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from my_path.domain.models import Barrier, FlagStatus, Language, Route, Tone
from my_path.persistence.repository import Urgency

CoachName = Annotated[str, Field(min_length=1, max_length=128)]


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RunOut(ApiModel):
    id: str
    filename: str
    as_of: date
    status: Literal["processing", "ready", "failed"]
    total_records: int
    flagged_count: int
    drafted_count: int
    created_at: datetime


class FlagSummaryOut(ApiModel):
    id: str
    student_id: str
    first_name: str
    program: str
    barrier_types: list[str]
    days_to_drop: int
    route_to: list[str]
    status: str
    draft_source: str | None
    version: int


class ActionLogOut(ApiModel):
    id: str
    action: str
    coach: str
    before_text: str | None
    after_text: str | None
    reason: str | None
    created_at: datetime


class FlagDetailOut(FlagSummaryOut):
    run_id: str
    explanation: str | None
    source_fields: dict[str, str]
    draft_message: str | None
    original_draft: str | None
    draft_language: str | None
    dismiss_reason: str | None
    routed_to: str | None
    preferred_language: str
    actions: list[ActionLogOut]


class Counters(BaseModel):
    flagged: int
    pending: int
    approved: int
    routed: int
    dismissed: int
    most_urgent_days_to_drop: int | None


class SummaryOut(BaseModel):
    run: RunOut
    counters: Counters
    by_status: dict[str, int]
    by_barrier: dict[str, int]
    by_barrier_status: dict[str, dict[str, int]]
    programs: list[str]


class FlagQuery(BaseModel):
    """Queue filters (FR-10). All optional; combine freely."""

    model_config = ConfigDict(extra="forbid")

    barrier: Barrier | None = None
    program: str | None = None
    status: FlagStatus | None = None
    urgency: Urgency | None = None


class _ActionBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    coach: CoachName
    version: int = Field(ge=1, description="Flag version the coach was looking at.")


class ApproveIn(_ActionBase):
    action: Literal["approve"]
    message: Annotated[str, Field(max_length=2000)] | None = None


class DismissIn(_ActionBase):
    action: Literal["dismiss"]
    reason: Annotated[str, Field(min_length=1, max_length=500)]


class RouteIn(_ActionBase):
    action: Literal["route"]
    route_to: Literal[Route.BURSAR, Route.AID_OFFICE]


class ReopenIn(_ActionBase):
    action: Literal["reopen"]


class RedraftIn(_ActionBase):
    action: Literal["redraft"]
    language: Language
    tone: Tone = Tone.WARM


ActionIn = Annotated[
    ApproveIn | DismissIn | RouteIn | ReopenIn | RedraftIn, Field(discriminator="action")
]


class BarrierInfo(BaseModel):
    id: str
    label: str
    description: str
    routes_to: list[str]


class MetaOut(BaseModel):
    required_columns: list[str]
    barriers: list[BarrierInfo]
    max_upload_bytes: int
    max_words: int
    urgent_days: int
