import { useState, useEffect } from 'react';
import axios from 'axios';

export default function TaskDays() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get('/api/tasks', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTasks(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDay = async (taskId, dayType, currentValue) => {
    try {
      const payload = {};
      if (dayType === 'weekday') {
        payload.is_weekday = !currentValue;
      } else if (dayType === 'weekend') {
        payload.is_weekend = !currentValue;
      }

      await axios.put(`/api/tasks/${taskId}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1 className="mb-4">Дни Заданий</h1>
      <p className="text-secondary mb-4">
        Выберите, в какие дни (будни или выходные) должны быть активны определённые задания.
      </p>

      <div className="glass-panel">
        <table className="glass-table text-left">
          <thead>
            <tr>
              <th>Задание</th>
              <th>Будние дни</th>
              <th>Выходные дни</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id}>
                <td>
                  <div className="font-medium">{t.name} ({t.code})</div>
                </td>
                <td>
                  <button
                    onClick={() => toggleDay(t.id, 'weekday', t.is_weekday)}
                    className="btn"
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.875rem',
                      backgroundColor: t.is_weekday ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: t.is_weekday ? 'white' : 'var(--text-secondary)',
                      border: t.is_weekday ? '1px solid var(--primary-color)' : '1px solid var(--surface-border)',
                      borderRadius: '0.5rem',
                      width: '100px',
                      justifyContent: 'center'
                    }}
                  >
                    {t.is_weekday ? 'Вкл' : 'Выкл'}
                  </button>
                </td>
                <td>
                  <button
                    onClick={() => toggleDay(t.id, 'weekend', t.is_weekend)}
                    className="btn"
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.875rem',
                      backgroundColor: t.is_weekend ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: t.is_weekend ? 'white' : 'var(--text-secondary)',
                      border: t.is_weekend ? '1px solid var(--primary-color)' : '1px solid var(--surface-border)',
                      borderRadius: '0.5rem',
                      width: '100px',
                      justifyContent: 'center'
                    }}
                  >
                    {t.is_weekend ? 'Вкл' : 'Выкл'}
                  </button>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center text-secondary py-4">Нет созданных заданий</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
