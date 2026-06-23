import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Settings, ListTodo } from 'lucide-react';

export default function Dashboard() {
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [schedRes, usersRes, tasksRes] = await Promise.all([
        axios.get('/api/schedules', { headers }),
        axios.get('/api/users', { headers }),
        axios.get('/api/tasks', { headers })
      ]);
      setSchedules(schedRes.data);
      setUsers(usersRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Compute stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureSchedules = schedules.filter(s => new Date(s.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const nextSchedule = futureSchedules[0];

  const getUserName = (id) => {
    const user = users.find(u => u.id === id);
    return user ? user.full_name : 'Неизвестно';
  };

  const getTaskInfo = (id) => {
    const task = tasks.find(t => t.id === id);
    return task ? `${task.name} (${task.code})` : 'Неизвестное задание';
  };

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6">Дашборд</h1>
      
      {/* Quick Stats Cards */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="glass-panel flex-1 flex items-center gap-4 p-6" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)' }}>
          <div className="bg-primary/20 p-4 rounded-full text-primary">
            <Users size={32} />
          </div>
          <div>
            <p className="text-secondary text-sm font-bold uppercase tracking-wider mb-1">Всего братьев</p>
            <h2 className="text-3xl font-black text-white m-0">{users.length}</h2>
          </div>
        </div>
        
        <div className="glass-panel flex-1 flex items-center gap-4 p-6" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)' }}>
          <div className="bg-success/20 p-4 rounded-full text-success">
            <ListTodo size={32} />
          </div>
          <div>
            <p className="text-secondary text-sm font-bold uppercase tracking-wider mb-1">Всего заданий</p>
            <h2 className="text-3xl font-black text-white m-0">{tasks.length}</h2>
          </div>
        </div>

        <div className="glass-panel flex-1 flex items-center gap-4 p-6" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)' }}>
          <div className="bg-warning/20 p-4 rounded-full text-warning">
            <Calendar size={32} />
          </div>
          <div>
            <p className="text-secondary text-sm font-bold uppercase tracking-wider mb-1">Будущих встреч</p>
            <h2 className="text-3xl font-black text-white m-0">{futureSchedules.length}</h2>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Next Meeting Details */}
        <div className="glass-panel lg:w-2/3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="m-0 text-xl font-bold flex items-center gap-2">
              <Calendar className="text-primary" size={24} /> 
              Ближайшая встреча
            </h3>
            {nextSchedule && (
              <span className="bg-primary/20 text-primary px-4 py-1 rounded-full text-sm font-bold">
                {nextSchedule.meeting_type}
              </span>
            )}
          </div>

          {nextSchedule ? (
            <div>
              <p className="text-2xl font-black mb-6 text-white">
                {new Date(nextSchedule.date).toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              
              <div className="overflow-x-auto">
                <table className="glass-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-3">Задание</th>
                      <th className="text-left p-3">Основной участник</th>
                      <th className="text-left p-3">Помощник</th>
                      <th className="text-center p-3">№</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextSchedule.assignments.map((assignment, idx) => (
                      <tr key={idx} className="transition-colors hover:bg-white/5 border-b border-white/5 last:border-0">
                        <td className="p-3 font-medium text-white">{getTaskInfo(assignment.task_id)}</td>
                        <td className="p-3 text-secondary">{getUserName(assignment.main_user_id)}</td>
                        <td className="p-3 text-secondary">{assignment.helper_user_id ? getUserName(assignment.helper_user_id) : '-'}</td>
                        <td className="p-3 text-center text-secondary">{assignment.custom_name !== null ? assignment.custom_name : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white/5 rounded-xl border border-white/10">
              <Calendar size={48} className="text-secondary mb-4 opacity-50" />
              <p className="text-lg text-secondary m-0">Нет запланированных встреч.</p>
              <button onClick={() => navigate('/schedule')} className="btn btn-primary mt-4">
                Перейти в расписание
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass-panel lg:w-1/3 flex flex-col">
          <h3 className="m-0 mb-6 text-xl font-bold flex items-center gap-2">
            ⚡ Быстрые действия
          </h3>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => navigate('/schedule')} 
              className="btn w-full text-left justify-start p-4 hover:bg-primary/20 border border-white/10"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white' }}
            >
              <Calendar size={20} className="mr-3 text-primary" />
              <span className="font-medium text-lg">Составить расписание</span>
            </button>
            
            <button 
              onClick={() => navigate('/users')} 
              className="btn w-full text-left justify-start p-4 hover:bg-success/20 border border-white/10"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white' }}
            >
              <Users size={20} className="mr-3 text-success" />
              <span className="font-medium text-lg">Управление братьями</span>
            </button>
            
            <button 
              onClick={() => navigate('/settings')} 
              className="btn w-full text-left justify-start p-4 hover:bg-warning/20 border border-white/10"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white' }}
            >
              <Settings size={20} className="mr-3 text-warning" />
              <span className="font-medium text-lg">Настройки бота</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
