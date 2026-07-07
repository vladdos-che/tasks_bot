from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete as sa_delete
import aiohttp
import json
import os

from db.database import get_db
from db.models import VpsConductingQueue, User, Setting, AdminUser
from api import schemas
from api.core.deps import get_current_admin_user

router = APIRouter()

# ── Queue CRUD ────────────────────────────────────────────

@router.get("/queue", response_model=List[schemas.VpsConductingQueueItemOut])
async def get_queue(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(
        select(VpsConductingQueue)
        .options()
        .order_by(VpsConductingQueue.position.asc())
    )
    items = result.scalars().all()

    # Eagerly load user names
    out = []
    for item in items:
        user = await db.get(User, item.user_id)
        out.append(schemas.VpsConductingQueueItemOut(
            id=item.id,
            user_id=item.user_id,
            position=item.position,
            user_name=user.full_name if user else "Удалён",
            telegram_id=user.telegram_id if user else None,
        ))
    return out


@router.post("/queue", response_model=List[schemas.VpsConductingQueueItemOut])
async def set_queue(
    payload: schemas.VpsConductingQueueSet,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    # Delete existing queue
    await db.execute(sa_delete(VpsConductingQueue))

    # Insert new queue in order
    for position, user_id in enumerate(payload.user_ids):
        db.add(VpsConductingQueue(user_id=user_id, position=position))

    await db.commit()

    # Return the fresh queue
    return await get_queue(db=db, current_admin=current_admin)


@router.post("/rotate", response_model=List[schemas.VpsConductingQueueItemOut])
async def rotate_queue(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(
        select(VpsConductingQueue).order_by(VpsConductingQueue.position.asc())
    )
    items = result.scalars().all()

    if len(items) < 2:
        raise HTTPException(status_code=400, detail="Недостаточно участников для ротации")

    max_pos = items[-1].position
    first = items[0]

    # Shift everyone up by 1
    for item in items[1:]:
        item.position -= 1

    # Move the first to the end
    first.position = max_pos

    await db.commit()
    return await get_queue(db=db, current_admin=current_admin)


# ── Config ────────────────────────────────────────────────

VPS_CONFIG_KEY = "vps_conducting_config"

@router.get("/config")
async def get_config(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(Setting).where(Setting.key == VPS_CONFIG_KEY))
    setting = result.scalars().first()
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except (json.JSONDecodeError, TypeError):
            pass
    # Default config
    return {
        "day_of_week": 1,
        "time": "08:00",
        "message_template": "Напоминание: на этой неделе вы ответственны за проведение ВПС.\n\nБрат: {user_name}"
    }


@router.post("/config")
async def set_config(
    config: schemas.VpsConductingConfigIn,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    value = json.dumps(config.model_dump(), ensure_ascii=False)
    result = await db.execute(select(Setting).where(Setting.key == VPS_CONFIG_KEY))
    setting = result.scalars().first()
    if setting:
        setting.value = value
    else:
        db.add(Setting(key=VPS_CONFIG_KEY, value=value))
    await db.commit()
    return config.model_dump()


# ── Force send ────────────────────────────────────────────

@router.post("/force-send")
async def force_send(
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    try:
        bot_host = os.getenv("BOT_INTERNAL_HOST", "http://localhost:8001")
        url = f"{bot_host}/force_vps_send"
        async with aiohttp.ClientSession() as session:
            async with session.post(url) as response:
                if response.status == 200:
                    return {"message": "Уведомление отправлено"}
                else:
                    raise HTTPException(status_code=500, detail="Бот вернул ошибку")
    except aiohttp.ClientError as e:
        raise HTTPException(status_code=500, detail=f"Не удалось связаться с ботом: {str(e)}")
