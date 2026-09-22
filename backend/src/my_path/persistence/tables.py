"""ORM tables. Schema changes go through Alembic migrations in ``migrations/``."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import Any, ClassVar

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    type_annotation_map: ClassVar[dict[Any, Any]] = {
        dict[str, Any]: JSON,
        list[str]: JSON,
        list[dict[str, Any]]: JSON,
    }


class RunRow(Base):
    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String(255))
    as_of: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(16), index=True)
    total_records: Mapped[int] = mapped_column(Integer)
    flagged_count: Mapped[int] = mapped_column(Integer)
    drafted_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    flags: Mapped[list[FlagRow]] = relationship(back_populates="run", cascade="all, delete-orphan")


class FlagRow(Base):
    __tablename__ = "flags"
    __table_args__ = (
        Index("ix_flags_run_urgency", "run_id", "days_to_drop"),
        Index("ix_flags_run_status", "run_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id", ondelete="CASCADE"))
    student_id: Mapped[str] = mapped_column(String(64))
    first_name: Mapped[str] = mapped_column(String(128))
    program: Mapped[str] = mapped_column(String(255), index=True)
    record: Mapped[dict[str, Any]]
    barrier_types: Mapped[list[str]]
    findings: Mapped[list[dict[str, Any]]]
    barrier_count: Mapped[int] = mapped_column(Integer)
    days_to_drop: Mapped[int] = mapped_column(Integer)
    source_fields: Mapped[dict[str, Any]]
    route_to: Mapped[list[str]]
    explanation: Mapped[str | None] = mapped_column(Text)
    original_draft: Mapped[str | None] = mapped_column(Text)
    draft_message: Mapped[str | None] = mapped_column(Text)
    draft_source: Mapped[str | None] = mapped_column(String(16))
    draft_language: Mapped[str | None] = mapped_column(String(8))
    status: Mapped[str] = mapped_column(String(16))
    dismiss_reason: Mapped[str | None] = mapped_column(Text)
    routed_to: Mapped[str | None] = mapped_column(String(32))
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    run: Mapped[RunRow] = relationship(back_populates="flags")
    actions: Mapped[list[ActionLogRow]] = relationship(
        back_populates="flag", cascade="all, delete-orphan", order_by="ActionLogRow.created_at"
    )

    __mapper_args__ = {"version_id_col": version}  # noqa: RUF012

    @property
    def preferred_language(self) -> str:
        return str(self.record["preferred_language"])


class ActionLogRow(Base):
    __tablename__ = "action_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    flag_id: Mapped[str] = mapped_column(ForeignKey("flags.id", ondelete="CASCADE"), index=True)
    action: Mapped[str] = mapped_column(String(16))
    coach: Mapped[str] = mapped_column(String(128))
    before_text: Mapped[str | None] = mapped_column(Text)
    after_text: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    flag: Mapped[FlagRow] = relationship(back_populates="actions")
