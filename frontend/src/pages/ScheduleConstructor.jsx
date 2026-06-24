import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function ScheduleConstructor() {
  // Data
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  // Settings
  const [meetingDays, setMeetingDays] = useState([]);
  const [isSavingDays, setIsSavingDays] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  
  // Form state
  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD
  const [meetingType, setMeetingType] = useState('');
  const [assignments, setAssignments] = useState({});
  const [excludedTasks, setExcludedTasks] = useState({});
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('success');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const showStatus = (msg, type = 'success') => {
    setStatusMsg(msg);
    setStatusType(type);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const daysOfWeek = [
    { label: 'Пн', value: 1 },
    { label: 'Вт', value: 2 },
    { label: 'Ср', value: 3 },
    { label: 'Чт', value: 4 },
    { label: 'Пт', value: 5 },
    { label: 'Сб', value: 6 },
    { label: 'Вс', value: 0 },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [tRes, uRes, mRes, setRes, schedRes] = await Promise.all([
        axios.get('/api/tasks', { headers }),
        axios.get('/api/users', { headers }),
        axios.get('/api/roles/matrix', { headers }),
        axios.get('/api/settings', { headers }),
        axios.get('/api/schedules', { headers })
      ]);
      setTasks(tRes.data);
      setUsers(uRes.data);
      setMatrix(mRes.data);
      setSchedules(schedRes.data);
      
      const md = setRes.data.find(s => s.key === 'meeting_days');
      if (md && md.value) {
        let parsed = md.value;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch(e) {}
        }
        if (Array.isArray(parsed)) {
          setMeetingDays(parsed);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDay = async (dayValue) => {
    let newDays;
    if (meetingDays.includes(dayValue)) {
      newDays = meetingDays.filter(d => d !== dayValue);
    } else {
      newDays = [...meetingDays, dayValue];
    }
    setMeetingDays(newDays);
    
    // Auto-save
    try {
      await axios.post('/api/settings', 
        { key: 'meeting_days', value: newDays }, 
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
    } catch (err) {
      console.error('Ошибка автоматического сохранения дней', err);
    }
  };

  // Removed saveMeetingDays since it's auto-saving now

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Calendar grid generation
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Pad start of month
    let startDay = date.getDay();
    if (startDay === 0) startDay = 7; // Make Sunday 7 for Monday-first logic
    for (let i = 1; i < startDay; i++) {
      days.push(null);
    }
    
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    
    return days;
  };

  const formatDateString = (date) => {
    if (!date) return '';
    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, 10);
    return localISOTime;
  };

  const handleDateClick = (date) => {
    const dayOfWeek = date.getDay();
    if (meetingDays.length > 0 && !meetingDays.includes(dayOfWeek)) {
      return; // Not a meeting day
    }
    
    const dateStr = formatDateString(date);
    setSelectedDate(dateStr);
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setMeetingType('Выходные');
    } else {
      setMeetingType('Будни');
    }

    // Check for draft in LocalStorage first
    const draft = localStorage.getItem(`schedule_draft_${dateStr}`);
    const draftExcluded = localStorage.getItem(`schedule_excluded_${dateStr}`);
    if (draft) {
      try {
        setAssignments(JSON.parse(draft));
        if (draftExcluded) {
          setExcludedTasks(JSON.parse(draftExcluded));
        } else {
          setExcludedTasks({});
        }
        return;
      } catch (e) {
        console.error("Error parsing draft", e);
      }
    }

    // Pre-fill assignments if schedule exists
    const existingSchedule = schedules.find(s => s.date === dateStr);
    if (existingSchedule) {
      const initAssignments = {};
      const initExcluded = {};
      
      const assignedTaskIds = new Set(existingSchedule.assignments.map(a => a.task_id));
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      const relevantTasks = tasks.filter(t => isWeekend ? t.is_weekend : t.is_weekday);
      
      relevantTasks.forEach(t => {
        if (!assignedTaskIds.has(t.id)) {
          initExcluded[t.id] = true;
        }
      });

      existingSchedule.assignments.forEach(a => {
        initAssignments[a.task_id] = {
          main_user_id: a.main_user_id || '',
          helper_user_id: a.helper_user_id || '',
          custom_name: a.custom_name !== null ? a.custom_name : ''
        };
      });
      setAssignments(initAssignments);
      setExcludedTasks(initExcluded);
    } else {
      setAssignments({});
      setExcludedTasks({});
    }
  };

  const handleSaveSchedule = async () => {
    if (!selectedDate) {
      showStatus("Выберите дату", "error");
      return;
    }
    
    const assignmentsArray = Object.keys(assignments).map(taskId => {
      const data = assignments[taskId];
      if (!data.main_user_id) return null; 
      return {
        task_id: parseInt(taskId),
        main_user_id: parseInt(data.main_user_id),
        helper_user_id: data.helper_user_id ? parseInt(data.helper_user_id) : null,
        custom_name: data.custom_name !== '' ? data.custom_name : null
      };
    }).filter(Boolean);

    try {
      await axios.post('/api/schedules', {
        date: selectedDate,
        meeting_type: meetingType,
        assignments: assignmentsArray
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showStatus('Расписание успешно сохранено!', 'success');
      localStorage.removeItem(`schedule_draft_${selectedDate}`);
      localStorage.removeItem(`schedule_excluded_${selectedDate}`);
      fetchData(); // Refresh schedules
    } catch (err) {
      console.error(err);
      showStatus(err.response?.data?.detail || 'Ошибка сохранения', 'error');
    }
  };

  const handleExportExcel = async () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    
    try {
      const response = await axios.get(`/api/schedules/export?year=${year}&month=${month}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `schedule_${year}_${month.toString().padStart(2, '0')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      showStatus('Ошибка при экспорте', 'error');
    }
  };

  const handleClearSchedule = () => {
    if (!selectedDate) return;
    setIsConfirmClearOpen(true);
  };

  const confirmClearSchedule = async () => {
    setIsConfirmClearOpen(false);
    const existingSchedule = schedules.find(s => s.date === selectedDate);
    if (existingSchedule) {
      try {
        await axios.delete(`/api/schedules/${existingSchedule.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchData();
      } catch (err) {
        console.error(err);
        showStatus('Ошибка удаления из базы', 'error');
        return;
      }
    }
    
    setAssignments({});
    setExcludedTasks({});
    localStorage.removeItem(`schedule_draft_${selectedDate}`);
    localStorage.removeItem(`schedule_excluded_${selectedDate}`);
  };

  const handleAutoDraft = async () => {
    if (!meetingType) return;
    
    const excludedIds = Object.keys(excludedTasks).filter(id => excludedTasks[id]).join(',');
    
    const assignmentsArray = Object.keys(assignments).map(taskId => {
      const data = assignments[taskId];
      if (!data.main_user_id && !data.helper_user_id) return null; 
      return {
        task_id: parseInt(taskId),
        main_user_id: data.main_user_id ? parseInt(data.main_user_id) : null,
        helper_user_id: data.helper_user_id ? parseInt(data.helper_user_id) : null,
        custom_name: data.custom_name !== '' ? data.custom_name : null
      };
    }).filter(Boolean);
    
    console.log("Sending POST to /api/schedules/auto-draft with:", {
      meeting_type: meetingType,
      exclude_tasks: excludedIds,
      current_assignments: assignmentsArray
    });
    
    try {
      const response = await axios.post('/api/schedules/auto-draft', {
        date: selectedDate,
        meeting_type: meetingType,
        exclude_tasks: excludedIds,
        current_assignments: assignmentsArray
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const newAssignments = { ...assignments };
      response.data.forEach(a => {
        newAssignments[a.task_id] = {
          main_user_id: a.main_user_id || '',
          helper_user_id: a.helper_user_id || '',
          custom_name: a.custom_name !== null ? a.custom_name : (newAssignments[a.task_id]?.custom_name || '')
        };
      });
      
      setAssignments(newAssignments);
      if (selectedDate) {
        localStorage.setItem(`schedule_draft_${selectedDate}`, JSON.stringify(newAssignments));
      }
    } catch (err) {
      console.error(err);
      showStatus('Ошибка автозаполнения', 'error');
    }
  };

  const getEligibleUsers = (taskId) => {
    const allowedRoles = matrix.filter(m => m.task_id === taskId).map(m => m.role_id);
    return users.filter(user => 
      user.roles.some(r => allowedRoles.includes(r.id))
    );
  };

  const handleAssignmentChange = (taskId, field, value) => {
    setAssignments(prev => {
      const newAssignments = {
        ...prev,
        [taskId]: {
          ...prev[taskId] || {},
          [field]: value
        }
      };
      
      // Save draft to cache
      if (selectedDate) {
        localStorage.setItem(`schedule_draft_${selectedDate}`, JSON.stringify(newAssignments));
      }
      
      return newAssignments;
    });
  };

  const filteredTasks = tasks.filter(t => {
    if (meetingType === 'Выходные') return t.is_weekend;
    return t.is_weekday;
  });

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  return (
    <div>
      <h1 className="mb-4">Конструктор расписания</h1>

      {statusMsg && (
        <div 
          className={`p-4 rounded text-center font-bold mb-4 ${statusType === 'success' ? 'text-success' : 'text-danger'}`}
          style={{
            backgroundColor: statusType === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            transition: 'all 0.3s ease'
          }}
        >
          {statusMsg}
        </div>
      )}

      {/* Meeting Days Settings */}
      <div className="glass-panel mb-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <h3 style={{ margin: 0 }}>Дни встреч собрания</h3>
        <div className="flex gap-2 meeting-days-row">
          {daysOfWeek.map(day => {
            const isActive = meetingDays.includes(day.value);
            return (
              <div 
                key={day.value}
                onClick={() => toggleDay(day.value)}
                className="transition text-sm font-bold text-center"
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${isActive ? 'var(--primary-color)' : 'transparent'}`,
                  color: isActive ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {day.label}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        {/* Calendar */}
        <div className="glass-panel" style={{ flex: 1 }}>
          <div className="flex justify-between items-center mb-4 calendar-header">
            <div className="flex items-center gap-4">
              <button onClick={prevMonth} className="btn btn-primary" style={{ padding: '0.4rem' }}><ChevronLeft size={20}/></button>
              <h3 style={{ margin: 0, minWidth: '150px', textAlign: 'center' }}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
              <button onClick={nextMonth} className="btn btn-primary" style={{ padding: '0.4rem' }}><ChevronRight size={20}/></button>
            </div>
            <button onClick={handleExportExcel} className="btn" style={{ padding: '0.4rem 0.8rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--success-color)', border: '1px solid rgba(16, 185, 129, 0.5)' }}>
              Экспорт в Excel
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
              <div key={d} className="text-secondary font-bold text-sm mb-2">{d}</div>
            ))}
            
            {getDaysInMonth().map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;
              
              const dateStr = formatDateString(date);
              const isSelected = dateStr === selectedDate;
              const hasSchedule = schedules.some(s => s.date === dateStr);
              const isMeetingDay = meetingDays.includes(date.getDay());

              return (
                <div 
                  key={i}
                  onClick={() => handleDateClick(date)}
                  style={{
                    padding: '10px 5px',
                    borderRadius: '8px',
                    cursor: isMeetingDay ? 'pointer' : 'not-allowed',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.5)' : (isMeetingDay ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.01)'),
                    border: `1px solid ${isSelected ? 'var(--primary-color)' : 'transparent'}`,
                    opacity: isMeetingDay ? 1 : 0.3,
                    position: 'relative'
                  }}
                  className="transition"
                >
                  {date.getDate()}
                  {hasSchedule && (
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--success-color)'
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Info */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedDate ? (
            <div className="flex flex-col h-full justify-between w-full">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-primary" style={{ margin: 0, fontSize: '2rem' }}>
                    {new Date(selectedDate).toLocaleDateString('ru-RU')}
                  </h2>
                  <span style={{ 
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                    color: 'var(--primary-color)',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontWeight: 'bold'
                  }}>
                    {meetingType}
                  </span>
                </div>
                <p className="text-secondary" style={{ lineHeight: '1.5' }}>
                  Заполните таблицу ниже, чтобы назначить братьев на задания для этой встречи.
                </p>
              </div>
              <div className="flex gap-3 mt-auto pt-4 schedule-actions">
                <button onClick={handleClearSchedule} className="btn btn-danger" style={{ padding: '0.75rem', marginRight: 'auto' }} title="Сбросить всё на этот день">
                  <Trash2 size={20} />
                </button>
                <button onClick={handleAutoDraft} className="btn" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning-color)', border: '1px solid rgba(245, 158, 11, 0.5)' }}>
                  ✨ Автозаполнение
                </button>
                <button onClick={handleSaveSchedule} className="btn btn-primary">
                  <Save size={20} className="mr-2" /> Сохранить
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-secondary text-center">Выберите доступный день встречи в календаре, чтобы начать составление расписания.</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Table */}
      {selectedDate && (
        <div className="glass-panel animate-fade-in">
          <table className="glass-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }} title="Включить задание на эту встречу">Вкл</th>
                <th>Задание</th>
                <th>Основной участник</th>
                <th>Помощник</th>
                <th style={{ width: '80px' }}>Номер</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(t => {
                const eligibleUsers = getEligibleUsers(t.id);
                const isExcluded = !!excludedTasks[t.id];
                
                return (
                  <tr key={t.id} style={{ opacity: isExcluded ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0.5rem' }}>
                      <button
                        onClick={() => {
                          const checked = isExcluded; // toggling to checked state
                          setExcludedTasks(prev => {
                            const newExcluded = { ...prev, [t.id]: !checked };
                            if (selectedDate) {
                              localStorage.setItem(`schedule_excluded_${selectedDate}`, JSON.stringify(newExcluded));
                            }
                            return newExcluded;
                          });
                          if (!checked) {
                            handleAssignmentChange(t.id, 'main_user_id', '');
                            handleAssignmentChange(t.id, 'helper_user_id', '');
                          }
                        }}
                        className="transition"
                        style={{
                          width: '100%',
                          padding: '6px 0',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          backgroundColor: !isExcluded ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: !isExcluded ? 'var(--success-color)' : 'var(--text-secondary)',
                          border: `1px solid ${!isExcluded ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                        }}
                        title={!isExcluded ? 'Исключить задание на эту встречу' : 'Включить задание на эту встречу'}
                      >
                        {!isExcluded ? 'Да' : 'Нет'}
                      </button>
                    </td>
                    <td>{t.name} ({t.code})</td>
                    <td>
                      <select 
                        className="form-input" 
                        value={assignments[t.id]?.main_user_id || ''}
                        onChange={e => handleAssignmentChange(t.id, 'main_user_id', e.target.value)}
                      >
                        <option value="">-- Выберите --</option>
                        {eligibleUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {t.requires_partner ? (
                        <select 
                          className="form-input" 
                          value={assignments[t.id]?.helper_user_id || ''}
                          onChange={e => handleAssignmentChange(t.id, 'helper_user_id', e.target.value)}
                        >
                          <option value="">-- Выберите --</option>
                          {users.map(u => ( 
                            <option key={u.id} value={u.id}>{u.full_name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-secondary text-center text-sm opacity-50">-</div>
                      )}
                    </td>
                    <td>
                      {t.requires_custom_name ? (
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Название" 
                          style={{ width: '120px' }}
                          value={assignments[t.id]?.custom_name !== undefined ? assignments[t.id].custom_name : ''}
                          onChange={e => handleAssignmentChange(t.id, 'custom_name', e.target.value)}
                        />
                      ) : (
                        <div className="text-secondary text-center text-sm opacity-50">-</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal 
        isOpen={isConfirmClearOpen}
        title="Вы уверены, что хотите полностью очистить расписание на этот день?"
        onConfirm={confirmClearSchedule}
        onCancel={() => setIsConfirmClearOpen(false)}
      />
    </div>
  );
}
