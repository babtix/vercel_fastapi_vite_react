# Main entry point for the FastAPI backend.
# Defines the app, middleware, routers, and server configuration.

import os
import sys
import logging
# Add current directory to path to resolve routers, services, core, etc. under any runtime context
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from routers import auth, agents, conversations
from routers import settings as settings_router
from routers import rag as rag_router
from routers import research as research_router
from tools import export_tool, pdf_reader_tool, docx_reader_tool
from core.settings import settings
from core.database import init_db
from core.rate_limit import limiter

# Create static directories
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
try:
    os.makedirs(os.path.join(static_dir, "logos"), exist_ok=True)
except OSError:
    # Safely ignore if the filesystem is read-only (e.g. Vercel serverless)
    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as exc:
        logging.error("Database initialization failed: %s", exc)
        # Don't crash the app on DB failure — endpoints will return 500 individually
    yield


app = FastAPI(
    title="Multi-IA Consultant API",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Rate limiting setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Static files mounting (only if directory exists; Vercel serverless is read-only)
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
else:
    logging.warning("Static directory '%s' does not exist; skipping StaticFiles mount.", static_dir)


# CORS middleware setup
# Append production domain to configured origins
_cors_origins = list(settings.CORS_ORIGINS)
_production_origin = "https://vercelfastapivitereact.vercel.app"
if _production_origin not in _cors_origins:
    _cors_origins.append(_production_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# API Routes registration (Dual-prefix mapping for local dev and production Vercel compatibility)
# Direct routes (local dev / clean routes)
app.include_router(auth.router, tags=["Auth"])
app.include_router(agents.router, tags=["Agents"])
app.include_router(conversations.router, tags=["Conversations"])
app.include_router(export_tool.router, tags=["Tools"])
app.include_router(pdf_reader_tool.router, tags=["Tools"])
app.include_router(docx_reader_tool.router, tags=["Tools"])
app.include_router(settings_router.router, tags=["Settings"])
app.include_router(rag_router.router, tags=["RAG"])
app.include_router(research_router.router, tags=["Research"])

# Production '/api/' prefixed routes (Vercel serverless routing matches)
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(agents.router, prefix="/api", tags=["Agents"])
app.include_router(conversations.router, prefix="/api", tags=["Conversations"])
app.include_router(export_tool.router, prefix="/api", tags=["Tools"])
app.include_router(pdf_reader_tool.router, prefix="/api", tags=["Tools"])
app.include_router(docx_reader_tool.router, prefix="/api", tags=["Tools"])
app.include_router(settings_router.router, prefix="/api", tags=["Settings"])
app.include_router(rag_router.router, prefix="/api", tags=["RAG"])
# Note: research_router.router already has prefix="/api" inside its file, so we do not double-prefix it.


@app.get("/")
def read_root():
    return {"message": "Welcome to Multi-IA Consultant API"}


if __name__ == "__main__":
    import uvicorn
    # Start the server
    uvicorn.run("main:app", host="0.0.0.0", port=8008, reload=True)
