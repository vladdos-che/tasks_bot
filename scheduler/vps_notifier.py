import logging
import json
from aiogram import Bot
from sqlalchemy.future import select

from db.database import AsyncSessionLocal
from db.models import VpsConductingQueue, User, Setting

VPS_CONFIG_KEY = "vps_conducting_config"


async def send_vps_notification(bot: Bot) -> None:
    """
    Sends a VPS conducting reminder to the person at position 0,
    then rotates the queue (position 0 -> last).
    """
    async with AsyncSessionLocal() as session:
        # 1. Read config
        result = await session.execute(select(Setting).where(Setting.key == VPS_CONFIG_KEY))
        setting = result.scalars().first()
        if not setting or not setting.value:
            logging.info("VPS conducting config not set, skipping.")
            return

        try:
            config = json.loads(setting.value)
        except (json.JSONDecodeError, TypeError):
            logging.error("Failed to parse vps_conducting_config")
            return

        template = config.get(
            "message_template",
            "Напоминание: на этой неделе вы ответственны за проведение ВПС.\n\nБрат: {user_name}"
        )

        # 2. Get the person at position 0
        result = await session.execute(
            select(VpsConductingQueue).order_by(VpsConductingQueue.position.asc())
        )
        queue = result.scalars().all()

        if not queue:
            logging.info("VPS conducting queue is empty, nothing to send.")
            return

        current = queue[0]
        user = await session.get(User, current.user_id)

        if not user:
            logging.warning(f"User {current.user_id} not found in DB, skipping VPS notification.")
            return

        if not user.telegram_id:
            logging.warning(f"User {user.full_name} has no telegram_id, can't send VPS notification.")
        else:
            # Build message from template
            message = template.replace("{user_name}", user.full_name)

            try:
                await bot.send_message(chat_id=user.telegram_id, text=message)
                logging.info(f"VPS notification sent to {user.full_name} (tg:{user.telegram_id})")
            except Exception as e:
                logging.error(f"Failed to send VPS notification to {user.telegram_id}: {e}")

        # 3. Rotate: move current to end, shift others up
        if len(queue) >= 2:
            max_pos = queue[-1].position
            for item in queue[1:]:
                item.position -= 1
            current.position = max_pos
            await session.commit()
            logging.info("VPS conducting queue rotated successfully.")
