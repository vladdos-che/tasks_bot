from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, JSON, Table
from sqlalchemy.orm import relationship
from db.database import Base

user_roles = Table('user_roles', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

class AdminUser(Base):
    __tablename__ = 'admin_users'
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_superadmin = Column(Boolean, default=False, nullable=False)

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    telegram_id = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    main_assignments = relationship("ScheduleAssignment", back_populates="main_user", foreign_keys="[ScheduleAssignment.main_user_id]")
    helper_assignments = relationship("ScheduleAssignment", back_populates="helper_user", foreign_keys="[ScheduleAssignment.helper_user_id]")

class InviteToken(Base):
    __tablename__ = 'invite_tokens'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    token = Column(String, nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    
    user = relationship("User")

class Role(Base):
    __tablename__ = 'roles'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    
    users = relationship("User", secondary=user_roles, back_populates="roles")

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, nullable=False) # e.g., МОЛ1, СБ
    name = Column(String, nullable=False)
    requires_custom_name = Column(Boolean, default=False)
    requires_partner = Column(Boolean, default=False)
    is_weekday = Column(Boolean, default=True)
    is_weekend = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)
    
    matrix_entries = relationship("RoleTaskMatrix", back_populates="task", cascade="all, delete-orphan")
    assignments = relationship("ScheduleAssignment", back_populates="task", cascade="all, delete-orphan")

class RoleTaskMatrix(Base):
    __tablename__ = 'role_task_matrix'
    id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=True)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    
    role = relationship("Role")
    task = relationship("Task", back_populates="matrix_entries")

class Schedule(Base):
    __tablename__ = 'schedules'
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, unique=True)
    meeting_type = Column(String, nullable=False) # 'Будни' or 'Выходные'
    
    assignments = relationship("ScheduleAssignment", back_populates="schedule", cascade="all, delete-orphan")

class ScheduleAssignment(Base):
    __tablename__ = 'schedule_assignments'
    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(Integer, ForeignKey('schedules.id'), nullable=False)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    main_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    helper_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    custom_name = Column(String, nullable=True) # Custom text instead of a number for tasks that require details
    
    schedule = relationship("Schedule", back_populates="assignments")
    task = relationship("Task", back_populates="assignments")
    main_user = relationship("User", foreign_keys=[main_user_id], back_populates="main_assignments")
    helper_user = relationship("User", foreign_keys=[helper_user_id], back_populates="helper_assignments")

class Setting(Base):
    __tablename__ = 'settings'
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(JSON, nullable=False)

class SpeakerGiftQueue(Base):
    __tablename__ = 'speaker_gift_queue'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    position = Column(Integer, nullable=False)

    user = relationship("User")
