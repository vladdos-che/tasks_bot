import asyncio
from aiogram import Bot, Dispatcher
from config import BOT_TOKEN
from bot.handlers.registration import router as registration_router
from scheduler.notifier import send_notifications
from scheduler.gift_notifier import send_gift_notification
from aiohttp import web
import logging
from datetime import datetime
import json
from sqlalchemy.future import select
from db.database import AsyncSessionLocal
from db.models import Setting

bot = Bot(BOT_TOKEN)
dp = Dispatcher()
dp.include_router(registration_router)

# Webhook for Force Run
async def handle_force_run(request):
    logging.info("Force run triggered via webhook")
    
    rule_to_run = None
    if request.can_read_body:
        try:
            data = await request.json()
            rule_id = data.get('rule_id')
            if rule_id:
                async with AsyncSessionLocal() as session:
                    result = await session.execute(select(Setting).where(Setting.key == 'notification_schedules'))
                    setting = result.scalars().first()
                    if setting and setting.value:
                        schedules = json.loads(setting.value)
                        for r in schedules:
                            if r.get('id') == rule_id:
                                rule_to_run = r
                                break
        except Exception as e:
            logging.error(f"Failed to read webhook body: {e}")

    # Start notification in background to not block response
    asyncio.create_task(send_notifications(bot, rule_to_run))
    return web.json_response({"status": "ok"})

async def handle_force_gift_send(request):
    logging.info("Force gift send triggered via webhook")
    await send_gift_notification(bot)
    return web.json_response({"status": "ok"})

async def start_web_server():
    app = web.Application()
    app.add_routes([
        web.post('/force_run', handle_force_run),
        web.post('/force_gift_send', handle_force_gift_send),
    ])
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8001)
    await site.start()
    logging.info("Started internal webhook server on port 8001")

async def notification_scheduler(bot: Bot):
    last_sent_minute = None
    logging.info("Started background notification scheduler")
    while True:
        now = datetime.now()
        current_minute = now.strftime("%H:%M")
        
        # Map python weekday (0=Mon, 6=Sun) to JS dayOfWeek (1=Mon, 0=Sun)
        js_day = (now.weekday() + 1) % 7
        js_date = now.day
        
        if current_minute != last_sent_minute:
            try:
                async with AsyncSessionLocal() as session:
                    result = await session.execute(select(Setting).where(Setting.key == 'notification_schedules'))
                    setting = result.scalars().first()
                    
                    if setting and setting.value:
                        try:
                            schedules = json.loads(setting.value)
                            for sched in schedules:
                                stype = sched.get('scheduleType', 'weekly')
                                
                                should_run = False
                                if stype == 'weekly':
                                    if int(sched.get('dayOfWeek', -1)) == js_day and sched.get('time') == current_minute:
                                        should_run = True
                                elif stype == 'monthly':
                                    if int(sched.get('dayOfMonth', -1)) == js_date and sched.get('time') == current_minute:
                                        should_run = True
                                        
                                if should_run:
                                    logging.info(f"Triggering scheduled notification for {sched.get('name', 'legacy')} at {current_minute}")
                                    asyncio.create_task(send_notifications(bot, sched))
                                    
                            last_sent_minute = current_minute
                        except json.JSONDecodeError:
                            logging.error("Failed to parse notification_schedules json")

                    # ── Speaker Gift scheduler ──
                    gift_result = await session.execute(select(Setting).where(Setting.key == 'speaker_gift_config'))
                    gift_setting = gift_result.scalars().first()
                    if gift_setting and gift_setting.value:
                        try:
                            gift_config = json.loads(gift_setting.value)
                            gift_day = int(gift_config.get('day_of_week', -1))
                            gift_time = gift_config.get('time', '')
                            if gift_day == js_day and gift_time == current_minute:
                                logging.info(f"Triggering speaker gift notification at {current_minute}")
                                asyncio.create_task(send_gift_notification(bot))
                        except (json.JSONDecodeError, TypeError) as e:
                            logging.error(f"Failed to parse speaker_gift_config: {e}")

            except Exception as e:
                logging.error(f"Error in scheduler: {e}")
                
        await asyncio.sleep(30)

async def main():
    logging.basicConfig(level=logging.INFO)
    
    # Ensure all DB tables exist
    from db.database import init_db
    await init_db()

    # Start aiohttp server for FastAPI to trigger
    await start_web_server()

    # Start background scheduler
    asyncio.create_task(notification_scheduler(bot))

    # Start polling
    logging.info("Starting bot polling...")
    await dp.start_polling(bot)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Bot stopped.")
