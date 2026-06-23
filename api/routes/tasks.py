from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.database import get_db
from db.models import Task, AdminUser
from api import schemas
from api.core.deps import get_current_admin_user

router = APIRouter()

@router.get("", response_model=list[schemas.TaskOut])
async def get_tasks(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(Task).order_by(Task.order_index.asc(), Task.id.asc()))
    return result.scalars().all()

@router.post("", response_model=schemas.TaskOut)
async def create_task(
    task_in: schemas.TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    from sqlalchemy import func
    max_order = await db.execute(select(func.max(Task.order_index)))
    max_idx = max_order.scalar() or 0
    
    new_task = Task(
        code=task_in.code,
        name=task_in.name,
        requires_custom_name=task_in.requires_custom_name,
        requires_partner=task_in.requires_partner,
        is_weekday=task_in.is_weekday,
        is_weekend=task_in.is_weekend,
        order_index=max_idx + 1
    )
    db.add(new_task)
    try:
        await db.commit()
        await db.refresh(new_task)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Task code may already exist")
    return new_task

@router.put("/{task_id}", response_model=schemas.TaskOut)
async def update_task(
    task_id: int,
    task_in: schemas.TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task_in.is_weekday is not None:
        task.is_weekday = task_in.is_weekday
    if task_in.is_weekend is not None:
        task.is_weekend = task_in.is_weekend
    if task_in.requires_partner is not None:
        task.requires_partner = task_in.requires_partner
    if task_in.requires_custom_name is not None:
        task.requires_custom_name = task_in.requires_custom_name
    if task_in.order_index is not None:
        task.order_index = task_in.order_index
        
    await db.commit()
    await db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()

@router.post("/reorder", status_code=status.HTTP_200_OK)
async def reorder_tasks(
    reorder_in: schemas.TaskReorder,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    # Fetch all tasks
    result = await db.execute(select(Task).where(Task.id.in_(reorder_in.task_ids)))
    tasks = result.scalars().all()
    task_map = {t.id: t for t in tasks}
    
    # Update order_index based on position in array
    for idx, task_id in enumerate(reorder_in.task_ids):
        if task_id in task_map:
            task_map[task_id].order_index = idx
            
    await db.commit()
    return {"status": "ok"}
