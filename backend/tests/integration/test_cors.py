from __future__ import annotations

from pathlib import Path

import httpx
import pytest

from my_path.container import build_container
from my_path.core.config import Settings
from my_path.main import create_app

PREVIEW = "https://kgervin-my-path-p56gcmaot-whoisgervins-projects.vercel.app"


@pytest.mark.parametrize(
    ("origin", "allowed"),
    [
        ("https://kgervin-my-path.vercel.app", True),
        (PREVIEW, True),
        ("https://evil-my-path.vercel.app", False),
        ("https://kgervin-my-path.vercel.app.evil.com", False),
    ],
)
async def test_cors_allows_configured_origins_and_preview_pattern(
    tmp_path: Path, origin: str, allowed: bool
) -> None:
    settings = Settings(
        environment="test",
        database_url=f"sqlite+aiosqlite:///{tmp_path / 'cors.db'}",
        cors_origins=["https://kgervin-my-path.vercel.app"],
        cors_origin_regex=r"^https://kgervin-my-path(-[a-z0-9-]+)?\.vercel\.app$",
    )
    app = create_app(settings, build_container(settings))
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.options(
                "/api/v1/meta",
                headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
            )
    assert (response.headers.get("access-control-allow-origin") == origin) is allowed
