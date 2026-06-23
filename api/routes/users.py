from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import uuid
import secrets
from datetime import datetime, timedelta, timezone

from db.database import get_db
from db.models import User, RoleTaskMatrix, AdminUser, Role, InviteToken
from api import schemas
from api.core.deps import get_current_admin_user

router = APIRouter()

@router.get("", response_model=list[schemas.UserOut])
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(User).options(selectinload(User.roles)))
    users = result.scalars().all()
    
    # Format roles for output (SQLAlchemy handles mapping directly now)
    formatted_users = []
    for user in users:
        user_dict = {
            "id": user.id,
            "full_name": user.full_name,
            "phone": user.phone,
            "address": user.address,
            "telegram_id": user.telegram_id,
            "is_active": user.is_active,
            "roles": user.roles
        }
        formatted_users.append(user_dict)
        
    return formatted_users

@router.post("", response_model=schemas.UserOut)
async def create_user(
    user_in: schemas.UserCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    # Check for duplicate
    existing_user_result = await db.execute(select(User).where(User.full_name == user_in.full_name))
    if existing_user_result.scalars().first():
        raise HTTPException(status_code=400, detail="Возвещатель с таким именем уже существует")

    new_user = User(
        full_name=user_in.full_name,
        phone=user_in.phone,
        address=user_in.address,
        is_active=user_in.is_active
    )
    
    role_ids = getattr(user_in, 'role_ids', None)
    if role_ids:
        roles_result = await db.execute(select(Role).where(Role.id.in_(role_ids)))
        new_user.roles = list(roles_result.scalars().all())
        
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Reload with relationships
    result = await db.execute(select(User).where(User.id == new_user.id).options(selectinload(User.roles)))
    loaded_user = result.scalars().first()
    
    return {
        "id": loaded_user.id, 
        "full_name": loaded_user.full_name, 
        "phone": loaded_user.phone,
        "address": loaded_user.address,
        "telegram_id": loaded_user.telegram_id, 
        "is_active": loaded_user.is_active, 
        "roles": loaded_user.roles
    }

@router.put("/{user_id}", response_model=schemas.UserOut)
async def update_user(
    user_id: int,
    user_in: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(User).where(User.id == user_id).options(selectinload(User.roles)))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_in.full_name != user.full_name:
        existing_user_result = await db.execute(select(User).where(User.full_name == user_in.full_name))
        if existing_user_result.scalars().first():
            raise HTTPException(status_code=400, detail="Возвещатель с таким именем уже существует")
            
    user.full_name = user_in.full_name
    user.phone = user_in.phone
    user.address = user_in.address
    user.is_active = user_in.is_active
    
    role_ids = getattr(user_in, 'role_ids', None)
    if role_ids is not None:
        roles_result = await db.execute(select(Role).where(Role.id.in_(role_ids)))
        user.roles = list(roles_result.scalars().all())
        
    await db.commit()
    await db.refresh(user)
    
    return {
        "id": user.id, 
        "full_name": user.full_name, 
        "phone": user.phone,
        "address": user.address,
        "telegram_id": user.telegram_id, 
        "is_active": user.is_active, 
        "roles": user.roles
    }

@router.post("/{user_id}/generate_invite")
async def generate_invite_link(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    # Retrieve user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if a token already exists for this user and delete it
    existing_result = await db.execute(select(InviteToken).where(InviteToken.user_id == user_id))
    existing_token = existing_result.scalars().first()
    if existing_token:
        await db.delete(existing_token)
        await db.flush()
    
    # Generate a unique token valid for 24 hours
    token_str = secrets.token_urlsafe(16)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    new_token = InviteToken(
        user_id=user.id,
        token=token_str,
        expires_at=expires_at
    )
    db.add(new_token)
    await db.commit()
    
    return {"token": token_str, "link": f"?start={token_str}"}

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
