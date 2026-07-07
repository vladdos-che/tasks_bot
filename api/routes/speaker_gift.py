from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete as sa_delete
import aiohttp
import json
import os

from db.database import get_db
from db.models import SpeakerGiftQueue, User, Setting, AdminUser
from api import schemas
from api.core.deps import get_current_admin_user

router = APIRouter()

# ── Queue CRUD ────────────────────────────────────────────

@router.get("/queue", response_model=List[schemas.SpeakerGiftQueueItemOut])
async def get_queue(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(
        select(SpeakerGiftQueue)
        .options()
        .order_by(SpeakerGiftQueue.position.asc())
    )
    items = result.scalars().all()

    # Eagerly load user names
    out = []
    for item in items:
        user = await db.get(User, item.user_id)
        out.append(schemas.SpeakerGiftQueueItemOut(
            id=item.id,
            user_id=item.user_id,
            position=item.position,
            user_name=user.full_name if user else "Удалён",
            telegram_id=user.telegram_id if user else None,
        ))
    return out


@router.post("/queue", response_model=List[schemas.SpeakerGiftQueueItemOut])
async def set_queue(
    payload: schemas.SpeakerGiftQueueSet,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    # Delete existing queue
    await db.execute(sa_delete(SpeakerGiftQueue))

    # Insert new queue in order
    for position, user_id in enumerate(payload.user_ids):
        db.add(SpeakerGiftQueue(user_id=user_id, position=position))

    await db.commit()

    # Return the fresh queue
    return await get_queue(db=db, current_admin=current_admin)


@router.post("/rotate", response_model=List[schemas.SpeakerGiftQueueItemOut])
async def rotate_queue(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(
        select(SpeakerGiftQueue).order_by(SpeakerGiftQueue.position.asc())
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

GIFT_CONFIG_KEY = "speaker_gift_config"

@router.get("/config")
async def get_config(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(Setting).where(Setting.key == GIFT_CONFIG_KEY))
    setting = result.scalars().first()
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except (json.JSONDecodeError, TypeError):
            pass
    # Default config
    return {
        "day_of_week": 1,
        "time": "18:00",
        "message_template": "Напоминание: на этой неделе вы ответственны за подготовку подарка для докладчика.\n\nБрат/сестра: {user_name}"
    }


@router.post("/config")
async def set_config(
    config: schemas.SpeakerGiftConfigIn,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    value = json.dumps(config.model_dump(), ensure_ascii=False)
    result = await db.execute(select(Setting).where(Setting.key == GIFT_CONFIG_KEY))
    setting = result.scalars().first()
    if setting:
        setting.value = value
    else:
        db.add(Setting(key=GIFT_CONFIG_KEY, value=value))
    await db.commit()
    return config.model_dump()


# ── Force send ────────────────────────────────────────────

@router.post("/force-send")
async def force_send(
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    try:
        bot_webhook_url = os.getenv("BOT_WEBHOOK_URL", "http://localhost:8001/force_gift_send")
        async with aiohttp.ClientSession() as session:
            async with session.post(bot_webhook_url) as response:
                if response.status == 200:
                    return {"message": "Уведомление отправлено"}
                else:
                    raise HTTPException(status_code=500, detail="Бот вернул ошибку")
    except aiohttp.ClientError as e:
        raise HTTPException(status_code=500, detail=f"Не удалось связаться с ботом: {str(e)}")
