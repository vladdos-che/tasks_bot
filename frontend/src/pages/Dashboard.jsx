import { useNavigate } from 'react-router-dom';
import { CalendarDays, Users, ShieldCheck, ListChecks, UserCog, Settings, ChevronRight, BookOpen } from 'lucide-react';

export default function Guide() {
  const navigate = useNavigate();

  const sections = [
    {
      icon: <CalendarDays size={28} />,
      title: 'Расписание',
      path: '/schedule',
      color: 'rgba(59, 130, 246, 0.15)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      iconColor: 'var(--primary-color)',
      description: 'Основной инструмент. Здесь вы составляете расписание на каждую встречу: выбираете дату в календаре, назначаете братьев на задания вручную или через автозаполнение, экспортируете готовое расписание в Excel.',
    },
    {
      icon: <Users size={28} />,
      title: 'Возвещатели',
      path: '/users',
      color: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      iconColor: 'var(--success-color)',
      description: 'Список всех братьев. Добавляйте новых (можно сразу несколько через запятую), редактируйте имя, телефон, адрес и роли. Генерируйте инвайт-ссылку, чтобы привязать Telegram-аккаунт.',
    },
    {
      icon: <ShieldCheck size={28} />,
      title: 'Роли и Доступы',
      path: '/roles',
      color: 'rgba(139, 92, 246, 0.15)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
      iconColor: '#8b5cf6',
      description: 'Создавайте роли и задания, а в матрице доступов настройте, какие роли могут выполнять какие задания. Здесь же включаются флаги: нужен ли напарник и требуется ли уточняющее название.',
    },
    {
      icon: <ListChecks size={28} />,
      title: 'Дни Заданий',
      path: '/task-days',
      color: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      iconColor: '#f59e0b',
      description: 'Выберите, в какие дни (будни или выходные) активно каждое задание. Конструктор расписания будет показывать только задания, подходящие для выбранного дня.',
    },
    {
      icon: <UserCog size={28} />,
      title: 'Администраторы',
      path: '/admins',
      color: 'rgba(236, 72, 153, 0.15)',
      borderColor: 'rgba(236, 72, 153, 0.3)',
      iconColor: '#ec4899',
      description: 'Управление учётными записями администраторов. Главный администратор может создавать новых, менять пароли и удалять. Обычный администратор может менять только свой пароль.',
    },
    {
      icon: <Settings size={28} />,
      title: 'Настройки бота',
      path: '/settings',
      color: 'rgba(99, 102, 241, 0.15)',
      borderColor: 'rgba(99, 102, 241, 0.3)',
      iconColor: '#6366f1',
      description: 'Правила автоматической рассылки уведомлений через Telegram-бот. Настройте расписание, шаблоны сообщений и охват. Здесь же — резервное копирование и восстановление базы данных.',
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
          padding: '12px',
          borderRadius: '16px',
        }}>
          <BookOpen size={28} style={{ color: 'var(--primary-color)' }} />
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Справка</h1>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem' }}>
            Краткое описание каждого раздела
          </p>
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: '1rem' }}>
        {sections.map((section) => (
          <div
            key={section.path}
            className="glass-panel"
            onClick={() => navigate(section.path)}
            style={{
              cursor: 'pointer',
              padding: '1.25rem 1.5rem',
              borderLeft: `3px solid ${section.borderColor}`,
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = section.color;
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '';
              e.currentTarget.style.transform = '';
            }}
          >
            <div className="flex items-center gap-4">
              <div style={{
                color: section.iconColor,
                background: section.color,
                padding: '10px',
                borderRadius: '12px',
                flexShrink: 0,
              }}>
                {section.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem' }}>{section.title}</h3>
                <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {section.description}
                </p>
              </div>
              <ChevronRight size={20} className="text-secondary" style={{ flexShrink: 0, opacity: 0.5 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
