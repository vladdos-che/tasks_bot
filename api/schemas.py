from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any
from datetime import date

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class AdminUserCreate(BaseModel):
    username: str
    password: str

class AdminUserUpdate(BaseModel):
    password: str  # обычные админы могут менять только пароль

class AdminUserOut(BaseModel):
    id: int
    username: str
    is_superadmin: bool
    model_config = ConfigDict(from_attributes=True)

class RoleBase(BaseModel):
    name: str

class RoleCreate(RoleBase):
    pass

class RoleOut(RoleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class TaskBase(BaseModel):
    code: str
    name: str
    requires_custom_name: bool = False
    requires_partner: bool = False
    is_weekday: bool = True
    is_weekend: bool = True
    order_index: int = 0

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    is_weekday: Optional[bool] = None
    is_weekend: Optional[bool] = None
    requires_partner: Optional[bool] = None
    requires_custom_name: Optional[bool] = None
    order_index: Optional[int] = None

class TaskReorder(BaseModel):
    task_ids: List[int]

class TaskOut(TaskBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    role_ids: Optional[List[int]] = []

class UserUpdate(UserBase):
    role_ids: Optional[List[int]] = []

class UserOut(UserBase):
    id: int
    telegram_id: Optional[str] = None
    roles: List[RoleOut] = []
    
    # We will compute roles manually or let ORM handle it with some tweaking.
    model_config = ConfigDict(from_attributes=True)

class ScheduleAssignmentBase(BaseModel):
    task_id: int
    main_user_id: Optional[int] = None
    helper_user_id: Optional[int] = None
    custom_name: Optional[str] = None

class ScheduleAssignmentCreate(ScheduleAssignmentBase):
    pass

class ScheduleAssignmentOut(ScheduleAssignmentBase):
    id: int
    schedule_id: int
    model_config = ConfigDict(from_attributes=True)

class ScheduleBase(BaseModel):
    date: date
    meeting_type: str

class ScheduleCreate(ScheduleBase):
    assignments: List[ScheduleAssignmentCreate]

class ScheduleOut(ScheduleBase):
    id: int
    assignments: List[ScheduleAssignmentOut] = []
    model_config = ConfigDict(from_attributes=True)

class SettingBase(BaseModel):
    key: str
    value: Any

class SettingCreate(SettingBase):
    pass

class SettingOut(SettingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class AutoDraftRequest(BaseModel):
    date: str
    meeting_type: str
    exclude_tasks: Optional[str] = None
    current_assignments: List[ScheduleAssignmentBase] = []

