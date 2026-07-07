from pydantic import BaseModel
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import aiohttp

from db.database import get_db
from db.models import Setting, AdminUser
from api import schemas
from api.core.deps import get_current_admin_user

router = APIRouter()

class ForceRunRequest(BaseModel):
    rule_id: Optional[str] = None

@router.get("", response_model=List[schemas.SettingOut])
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(Setting))
    return result.scalars().all()

@router.post("", response_model=schemas.SettingOut)
async def update_setting(
    setting_in: schemas.SettingCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(Setting).where(Setting.key == setting_in.key))
    setting = result.scalars().first()
    if setting:
        setting.value = setting_in.value
    else:
        setting = Setting(key=setting_in.key, value=setting_in.value)
        db.add(setting)
    await db.commit()
    await db.refresh(setting)
    return setting

@router.post("/force_run")
async def force_run_bot(
    request: ForceRunRequest,
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    # Call the bot's internal aiohttp server webhook
    # Assuming bot is running locally and exposes a simple webhook for trigger
    try:
        import os
        bot_host = os.getenv("BOT_INTERNAL_HOST", "http://localhost:8001")
        bot_webhook_url = f"{bot_host}/force_run"
        async with aiohttp.ClientSession() as session:
            payload = {"rule_id": request.rule_id} if request.rule_id else {}
            async with session.post(bot_webhook_url, json=payload) as response:
                if response.status == 200:
                    return {"message": "Force run triggered successfully"}
                else:
                    raise HTTPException(status_code=500, detail="Bot returned an error")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger bot: {str(e)}")
