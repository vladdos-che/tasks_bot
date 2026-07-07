import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { CalendarDays, Users, Settings, LogOut, ShieldCheck, UserCog, ListChecks, BookOpen, Gift } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function Layout() {
  const navigate = useNavigate();
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (currentY > lastScrollY.current + 4) {
            // Scrolling down
            setNavVisible(false);
          } else if (currentY < lastScrollY.current - 4) {
            // Scrolling up
            setNavVisible(true);
          }
          lastScrollY.current = currentY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navLinks = [
    { to: '/', icon: <BookOpen size={22} />, label: 'Справка', end: true },
    { to: '/schedule', icon: <CalendarDays size={22} />, label: 'Расписание' },
    { to: '/users', icon: <Users size={22} />, label: 'Возвещатели' },
    { to: '/roles', icon: <ShieldCheck size={22} />, label: 'Роли' },
    { to: '/task-days', icon: <ListChecks size={22} />, label: 'Задания' },
    { to: '/admins', icon: <UserCog size={22} />, label: 'Админы' },
    { to: '/speaker-gift', icon: <Gift size={22} />, label: 'Подарок' },
    { to: '/settings', icon: <Settings size={22} />, label: 'Настройки' },
  ];

  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="mb-4 text-center">
          <h2 className="text-primary flex items-center justify-center gap-2">
            <CalendarDays size={24} /> 
            ScheduleBot
          </h2>
        </div>
        
        {navLinks.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            end={end}
          >
            {icon} {label}
          </NavLink>
        ))}
        
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', justifyContent: 'flex-start' }}>
            <LogOut size={20} /> Выход
          </button>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="main-content animate-fade-in">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className={`mobile-bottom-nav ${navVisible ? 'mobile-bottom-nav--visible' : 'mobile-bottom-nav--hidden'}`}>
        {navLinks.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            end={end}
          >
            <span className="mobile-nav-icon">{icon}</span>
            <span className="mobile-nav-label">{label}</span>
          </NavLink>
        ))}
        <button onClick={handleLogout} className="mobile-nav-item mobile-nav-logout">
          <span className="mobile-nav-icon"><LogOut size={22} /></span>
          <span className="mobile-nav-label">Выход</span>
        </button>
      </nav>
    </div>
  )
}
