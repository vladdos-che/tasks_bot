from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from db.database import init_db
from api.routes import auth, users, roles, tasks, schedules, settings, admins, backups, speaker_gift, vps_conducting
app = FastAPI(title="Schedule Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(schedules.router, prefix="/api/schedules", tags=["Schedules"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(admins.router, prefix="/api/admins", tags=["Admins"])
app.include_router(backups.router, prefix="/api/backups", tags=["Backups"])
app.include_router(speaker_gift.router, prefix="/api/speaker-gift", tags=["SpeakerGift"])
app.include_router(vps_conducting.router, prefix="/api/vps-conducting", tags=["VpsConducting"])
@app.on_event("startup")
async def on_startup():
    await init_db()

@app.get("/")
async def root():
    return {"message": "API is running"}
