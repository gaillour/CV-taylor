"""FastAPI application entrypoint for CV Tailor."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from back.api.auth import router as auth_router
from back.api.routes.ats import router as ats_router
from back.api.routes.export import router as export_router
from back.api.routes.profile import router as profile_router
from back.api.routes.render import router as render_router
from back.api.routes.snapshots import router as snapshots_router
from back.api.routes.tailor import router as tailor_router

app = FastAPI(
    title="CV Tailor API",
    description="Deterministic 1-page Typst CV tailoring engine and interactive API",
    version="0.1.0",
)

# Enable CORS for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(profile_router, prefix="/api/profile", tags=["profile"])
app.include_router(render_router, prefix="/api/render", tags=["render"])
app.include_router(tailor_router, prefix="/api/tailor", tags=["tailor"])
app.include_router(ats_router, prefix="/api/ats", tags=["ats"])
app.include_router(export_router, prefix="/api/export", tags=["export"])
app.include_router(snapshots_router, prefix="/api/snapshots", tags=["snapshots"])


@app.get("/api/health")
def health_check() -> dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "ok"}


@app.get("/api/avatars/{filename}")
def get_avatar(filename: str) -> FileResponse:
    """Serve uploaded avatar images in local development mode."""
    safe_name = Path(filename).name
    avatar_path = Path("out/avatars") / safe_name
    if not avatar_path.is_file():
        raise HTTPException(status_code=404, detail="Avatar not found")
    media_type = "image/png" if safe_name.endswith(".png") else "image/jpeg"
    return FileResponse(avatar_path, media_type=media_type)
