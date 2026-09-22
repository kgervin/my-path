"""``python -m my_path`` runs the API with uvicorn (used by the container image)."""

import os

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "my_path.main:create_app",
        factory=True,
        host=os.getenv("HOST", "0.0.0.0"),  # noqa: S104 - bound inside a container
        port=int(os.getenv("PORT", "8000")),
        proxy_headers=True,
        log_config=None,
    )
