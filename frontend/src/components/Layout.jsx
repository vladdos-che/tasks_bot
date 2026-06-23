import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { CalendarDays, Users, LayoutDashboard, Settings, LogOut, ShieldCheck, UserCog, ListChecks } from 'lucide-react'

export default function Layout() {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="mb-4 text-center">
          <h2 className="text-primary flex items-center justify-center gap-2">
            <CalendarDays size={24} /> 
            ScheduleBot
          </h2>
        </div>
        
        <NavLink to="/" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={20} /> Дашборд
        </NavLink>
        
        <NavLink to="/schedule" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <CalendarDays size={20} /> Расписание
        </NavLink>
        
        <NavLink to="/users" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Users size={20} /> Возвещатели
        </NavLink>
        
        <NavLink to="/roles" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <ShieldCheck size={20} /> Роли и Доступы
        </NavLink>
        
        <NavLink to="/task-days" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <ListChecks size={20} /> Дни Заданий
        </NavLink>
        
        <NavLink to="/admins" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <UserCog size={20} /> Администраторы
        </NavLink>
        
        <NavLink to="/settings" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Settings size={20} /> Настройки бота
        </NavLink>
        
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', justifyContent: 'flex-start' }}>
            <LogOut size={20} /> Выход
          </button>
        </div>
      </aside>
      
      <main className="main-content animate-fade-in">
        <Outlet />
      </main>
    </div>
  )
}
