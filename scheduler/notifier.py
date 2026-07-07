import asyncio
from datetime import datetime, timedelta
import logging
from aiogram import Bot
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from db.database import AsyncSessionLocal
from db.models import Schedule, ScheduleAssignment, User, Task

async def send_notifications(bot: Bot, rule: dict = None) -> None:
    """
    Reads the upcoming schedule and sends notifications.
    If 'rule' is provided, it uses the rule's templates, target filter, and scope.
    """
    today = datetime.now().date()
    logging.info(f"Running schedule notifier looking for schedule >= {today} with rule: {rule}")

    async with AsyncSessionLocal() as session:
        query = select(Schedule).where(Schedule.date >= today).order_by(Schedule.date.asc())
        query = query.options(
            selectinload(Schedule.assignments).selectinload(ScheduleAssignment.main_user),
            selectinload(Schedule.assignments).selectinload(ScheduleAssignment.helper_user),
            selectinload(Schedule.assignments).selectinload(ScheduleAssignment.task)
        )
        
        import calendar
        
        scope = rule.get('scope', 'next') if rule else 'next'
        
        if scope == 'next':
            query = query.limit(1)
        elif scope == 'skip_next':
            # Get the meeting after the nearest one (i.e. skip one)
            query = query.limit(2)
        elif scope == 'next_30_days':
            query = query.where(Schedule.date <= today + timedelta(days=30))
        elif scope == 'current_month':
            last_day = calendar.monthrange(today.year, today.month)[1]
            end_date = datetime(today.year, today.month, last_day).date()
            query = query.where(Schedule.date <= end_date)
        elif scope == 'next_month':
            if today.month == 12:
                next_year = today.year + 1
                next_month = 1
            else:
                next_year = today.year
                next_month = today.month + 1
                
            start_date = datetime(next_year, next_month, 1).date()
            last_day = calendar.monthrange(next_year, next_month)[1]
            end_date = datetime(next_year, next_month, last_day).date()
            
            # Reset query to start from start_date
            query = select(Schedule).where(Schedule.date >= start_date, Schedule.date <= end_date).order_by(Schedule.date.asc())
            query = query.options(
                selectinload(Schedule.assignments).selectinload(ScheduleAssignment.main_user),
                selectinload(Schedule.assignments).selectinload(ScheduleAssignment.helper_user),
                selectinload(Schedule.assignments).selectinload(ScheduleAssignment.task)
            )
        elif scope == 'month': # Fallback for previous migration
            query = query.where(Schedule.date <= today + timedelta(days=31))
            
        result = await session.execute(query)
        schedules = result.scalars().unique().all()

        # For skip_next, drop the nearest meeting and keep only the one after
        if scope == 'skip_next':
            if len(schedules) < 2:
                logging.info("No meeting found after the nearest one for skip_next scope.")
                return
            schedules = schedules[1:]  # Keep only the second meeting

        if not schedules:
            logging.info("No upcoming schedules found.")
            return

        messages_to_send = {} # {telegram_id: [msg1, msg2, ...]}

        target = rule.get('target', 'all') if rule else 'all'
        
        default_main_tpl = "Напоминание: У вас назначение на предстоящую встречу ({date}).\n\nЗадание: {task_name}\nПомощник: {helper_name}"
        default_helper_tpl = "Напоминание: Вы выступаете как помощник на предстоящей встрече ({date}).\n\nЗадание: {task_name}\nВыступающий: {main_name}"
        
        main_tpl = rule.get('mainTemplate') if rule and rule.get('mainTemplate') else default_main_tpl
        helper_tpl = rule.get('helperTemplate') if rule and rule.get('helperTemplate') else default_helper_tpl

        for schedule in schedules:
            formatted_date = schedule.date.strftime('%d.%m.%Y')

            for assignment in schedule.assignments:
                task = assignment.task
                
                if target == 'with_custom_name' and not task.requires_custom_name:
                    continue
                if target == 'without_custom_name' and task.requires_custom_name:
                    continue

                # Prepare variables
                order_prefix = ""
                if task.requires_custom_name and assignment.custom_name:
                    order_prefix = f"«{assignment.custom_name}» "
                    
                full_task_name = f"{order_prefix}{task.name}"
                main_name = assignment.main_user.full_name if assignment.main_user else "Не назначен"
                helper_name = assignment.helper_user.full_name if assignment.helper_user else "Нет"
                order_str = str(assignment.custom_name) if assignment.custom_name else ""

                # Send to main user
                main_user = assignment.main_user
                if main_user and main_user.telegram_id:
                    msg = main_tpl.replace('{date}', formatted_date) \
                                  .replace('{task_name}', full_task_name) \
                                  .replace('{helper_name}', helper_name) \
                                  .replace('{custom_name}', order_str)
                    
                    messages_to_send.setdefault(main_user.telegram_id, []).append(msg)

                # Send to helper user
                helper_user = assignment.helper_user
                if helper_user and helper_user.telegram_id and task.requires_partner:
                    msg_helper = helper_tpl.replace('{date}', formatted_date) \
                                           .replace('{task_name}', full_task_name) \
                                           .replace('{main_name}', main_name) \
                                           .replace('{custom_name}', order_str)
                    messages_to_send.setdefault(helper_user.telegram_id, []).append(msg_helper)

        # Now send them
        for tg_id, msgs in messages_to_send.items():
            # Join multiple assignments with a separator
            combined_msg = "\n\n---\n\n".join(msgs)
            try:
                await bot.send_message(chat_id=tg_id, text=combined_msg)
            except Exception as e:
                logging.error(f"Failed to send message to {tg_id}: {e}")
