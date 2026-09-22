"""FastAPI dependency providers."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request

from my_path.container import Container
from my_path.persistence.repository import Repository
from my_path.services.review import ReviewService


def get_container(request: Request) -> Container:
    container: Container = request.app.state.container
    return container


ContainerDep = Annotated[Container, Depends(get_container)]


async def get_repository(container: ContainerDep) -> AsyncIterator[Repository]:
    async with container.database.sessionmaker() as session:
        yield Repository(session)


RepositoryDep = Annotated[Repository, Depends(get_repository)]


def get_review_service(repo: RepositoryDep, container: ContainerDep) -> ReviewService:
    return ReviewService(repo, container.drafting)


ReviewServiceDep = Annotated[ReviewService, Depends(get_review_service)]
