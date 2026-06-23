import logging
from aiogram import Router, types
from aiogram.filters import CommandStart, CommandObject
from sqlalchemy.future import select

from datetime import datetime, timezone

from db.database import AsyncSessionLocal
from db.models import User, InviteToken

router = Router()

@router.message(CommandStart())
async def start_command(message: types.Message, command: CommandObject):
    """Handles the /start command and initiates the registration flow."""
    args = command.args
    
    if args:
        try:
            token_str = args
            
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(InviteToken).where(InviteToken.token == token_str))
                invite = result.scalars().first()
                
                if invite:
                    # Check expiration
                    # Ensure datetime is timezone-aware for comparison
                    expires_at = invite.expires_at
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone.utc)
                        
                    if expires_at > datetime.now(timezone.utc):
                        user = await session.get(User, invite.user_id)
                        if user:
                            user.telegram_id = str(message.from_user.id)
                            # Remove the token so it can't be reused
                            await session.delete(invite)
                            await session.commit()
                            await message.reply(f"Добро пожаловать, {user.full_name}! Ваш Telegram аккаунт успешно привязан.")
                        else:
                            await message.reply("Пользователь не найден.")
                    else:
                        await session.delete(invite)
                        await session.commit()
                        await message.reply("Срок действия этой ссылки-приглашения истек (24 часа). Попросите новую ссылку.")
                else:
                    await message.reply("Недействительная ссылка-приглашение.")
        except Exception as e:
            logging.error(f"Error during registration linking: {e}")
            await message.reply("Произошла ошибка при привязке аккаунта. Ссылка недействительна.")
    else:
        await message.reply("Добро пожаловать! Для привязки аккаунта, пожалуйста, используйте специальную ссылку-приглашение из панели администратора.")
