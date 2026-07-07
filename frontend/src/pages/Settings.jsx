import { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Plus, Trash2, Save, Database, RefreshCw, Download } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function Settings() {
  const [rules, setRules] = useState([]);
  const [status, setStatus] = useState('');
  const [backups, setBackups] = useState([]);
  const [isBackupsLoading, setIsBackupsLoading] = useState(false);
  const [deleteBackupModal, setDeleteBackupModal] = useState(null);
  const [restoreBackupModal, setRestoreBackupModal] = useState(null);

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
    fetchSettings();
    fetchBackups();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const ns = response.data.find(s => s.key === 'notification_schedules');
      if (ns && ns.value) {
        try {
          const parsed = JSON.parse(ns.value);
          // Migrate old schedules to new format if needed
          const migrated = parsed.map(r => ({
            id: r.id || crypto.randomUUID(),
            name: r.name || 'Старое расписание',
            target: r.target || 'all',
            scheduleType: r.scheduleType || 'weekly',
            dayOfWeek: r.dayOfWeek ?? 1,
            dayOfMonth: r.dayOfMonth ?? 1,
            time: r.time || '18:00',
            scope: r.scope || 'next',
            mainTemplate: r.mainTemplate || 'Напоминание: У вас назначение на предстоящую встречу ({date}).\n\nЗадание: {task_name}\nПомощник: {helper_name}',
            helperTemplate: r.helperTemplate || 'Напоминание: Вы выступаете как помощник на предстоящей встрече ({date}).\n\nЗадание: {task_name}\nВыступающий: {main_name}'
          }));
          setRules(migrated);
        } catch (e) {
          console.error("Error parsing notification_schedules", e);
          setRules([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      await axios.post('/api/settings', { key: 'notification_schedules', value: JSON.stringify(rules) }, { headers });
      setStatus('Настройки сохранены');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus('Ошибка сохранения');
    }
  };

  const fetchBackups = async () => {
    try {
      const response = await axios.get('/api/backups', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBackups(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const createBackup = async () => {
    try {
      setIsBackupsLoading(true);
      await axios.post('/api/backups', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStatus('Резервная копия успешно создана');
      fetchBackups();
    } catch (err) {
      setStatus('Ошибка создания копии');
    } finally {
      setIsBackupsLoading(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const restoreBackup = async (filename) => {
    try {
      setIsBackupsLoading(true);
      await axios.post(`/api/backups/${filename}/restore`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStatus('База данных успешно восстановлена');
    } catch (err) {
      setStatus('Ошибка восстановления базы');
    } finally {
      setIsBackupsLoading(false);
      setRestoreBackupModal(null);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const deleteBackup = async (filename) => {
    try {
      await axios.delete(`/api/backups/${filename}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStatus('Резервная копия удалена');
      fetchBackups();
    } catch (err) {
      setStatus('Ошибка удаления копии');
    } finally {
      setDeleteBackupModal(null);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const addRule = () => {
    setRules([...rules, {
      id: crypto.randomUUID(),
      name: 'Новое правило',
      target: 'all',
      scheduleType: 'weekly',
      dayOfWeek: 1,
      dayOfMonth: 1,
      time: '18:00',
      scope: 'next',
      mainTemplate: 'Напоминание: У вас назначение на предстоящую встречу ({date}).\n\nЗадание: {task_name}\nПомощник: {helper_name}',
      helperTemplate: 'Напоминание: Вы выступаете как помощник на предстоящей встрече ({date}).\n\nЗадание: {task_name}\nВыступающий: {main_name}'
    }]);
  };

  const removeRule = (index) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
  };

  const updateRule = (index, field, value) => {
    const newRules = [...rules];
    if (field === 'dayOfWeek' || field === 'dayOfMonth') value = parseInt(value, 10);
    newRules[index][field] = value;
    setRules(newRules);
  };

  const forceRun = async (ruleId) => {
    try {
      await axios.post('/api/settings/force_run', { rule_id: ruleId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStatus('Бот запущен для выбранного правила.');
      setTimeout(() => setStatus(''), 5000);
    } catch (err) {
      setStatus('Ошибка запуска бота');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Правила рассылки уведомлений</h1>
        <button onClick={saveSettings} className="btn btn-primary">
          <Save size={20} className="mr-2" /> Сохранить
        </button>
      </div>
      
      {status && <div className="text-success p-4 rounded text-center font-bold" style={{backgroundColor: 'rgba(34, 197, 94, 0.1)', marginBottom: '1.5rem'}}>{status}</div>}

      <div className="flex flex-col" style={{ gap: '1.5rem' }}>
        {rules.length === 0 && (
          <div className="glass-panel text-center text-secondary py-12">
            Нет настроенных правил рассылки. Нажмите кнопку ниже, чтобы создать первое.
          </div>
        )}
        
        {rules.map((rule, index) => (
          <div key={rule.id} className="glass-panel relative" style={{ padding: '1.5rem' }}>
            <button 
              type="button" 
              className="absolute top-4 right-4 btn btn-danger" 
              style={{ padding: '0.4rem' }}
              onClick={() => removeRule(index)}
              title="Удалить правило"
            >
              <Trash2 size={18} />
            </button>
            
            <div className="flex gap-4 mb-4 flex-wrap" style={{ paddingRight: '3rem' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <label className="form-label mb-2">Название правила</label>
                <input 
                  type="text" 
                  className="form-input w-full" 
                  value={rule.name}
                  onChange={(e) => updateRule(index, 'name', e.target.value)}
                />
              </div>
              
              <div style={{ flex: 1, minWidth: '250px', display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  onClick={() => forceRun(rule.id)} 
                  className="btn btn-primary w-full" 
                  style={{ backgroundColor: 'var(--success-color)' }}
                  title="Отправить уведомления по этому правилу прямо сейчас"
                >
                  <Play size={18} className="mr-2" /> Принудительно разослать сейчас
                </button>
              </div>
            </div>

            <div className="flex gap-4 mb-4 flex-wrap">
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="form-label mb-2">Для каких заданий</label>
                <select 
                  className="form-input w-full"
                  value={rule.target}
                  onChange={(e) => updateRule(index, 'target', e.target.value)}
                >
                  <option value="all">Все задания</option>
                  <option value="with_custom_name">Только с названием/уточнением</option>
                  <option value="without_custom_name">Только без названия</option>
                </select>
              </div>
              
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="form-label mb-2">Охват рассылки</label>
                <select 
                  className="form-input w-full"
                  value={rule.scope}
                  onChange={(e) => updateRule(index, 'scope', e.target.value)}
                >
                  <option value="next">Только ближайшая встреча</option>
                  <option value="skip_next">Через одну встречу (не ближайшая, а следующая)</option>
                  <option value="next_30_days">Ближайшие 30 дней от сегодня</option>
                  <option value="current_month">До конца текущего месяца</option>
                  <option value="next_month">На весь следующий месяц (с 1-го числа)</option>
                </select>
              </div>
              
              <div style={{ flex: 2, minWidth: '300px' }}>
                <label className="form-label mb-2">Расписание запуска</label>
                <div className="flex gap-2">
                  <select 
                    className="form-input flex-1"
                    value={rule.scheduleType}
                    onChange={(e) => updateRule(index, 'scheduleType', e.target.value)}
                  >
                    <option value="weekly">Неделя</option>
                    <option value="monthly">Месяц</option>
                  </select>
                  
                  {rule.scheduleType === 'weekly' ? (
                    <select 
                      className="form-input flex-1"
                      value={rule.dayOfWeek}
                      onChange={(e) => updateRule(index, 'dayOfWeek', e.target.value)}
                    >
                      {daysOfWeek.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="number" 
                      min="1" max="31"
                      className="form-input"
                      style={{ width: '80px' }}
                      value={rule.dayOfMonth}
                      onChange={(e) => updateRule(index, 'dayOfMonth', e.target.value)}
                      title="День месяца"
                    />
                  )}
                  
                  <input 
                    type="time" 
                    className="form-input" 
                    style={{ width: '120px' }}
                    value={rule.time} 
                    onChange={(e) => updateRule(index, 'time', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              <div style={{ flex: 1, minWidth: '300px' }}>
                <label className="form-label mb-2">Текст основному участнику</label>
                <textarea 
                  className="form-input w-full"
                  rows="5"
                  value={rule.mainTemplate}
                  onChange={(e) => updateRule(index, 'mainTemplate', e.target.value)}
                  style={{ fontFamily: 'monospace' }}
                ></textarea>
                <div className="text-xs text-secondary mt-2">
                  Переменные: {'{task_name}'}, {'{date}'}, {'{helper_name}'}, {'{custom_name}'}
                </div>
              </div>
              
              <div style={{ flex: 1, minWidth: '300px' }}>
                <label className="form-label mb-2">Текст помощнику</label>
                <textarea 
                  className="form-input w-full"
                  rows="5"
                  value={rule.helperTemplate}
                  onChange={(e) => updateRule(index, 'helperTemplate', e.target.value)}
                  disabled={rule.target === 'without_custom_name'}
                  style={{ 
                    opacity: rule.target === 'without_custom_name' ? 0.3 : 1,
                    fontFamily: 'monospace' 
                  }}
                  title={rule.target === 'without_custom_name' ? "Шаблон недоступен, так как у заданий без названия не бывает помощников" : ""}
                ></textarea>
                <div className="text-xs text-secondary mt-2" style={{ opacity: rule.target === 'without_custom_name' ? 0.3 : 1 }}>
                  Переменные: {'{task_name}'}, {'{date}'}, {'{main_name}'}, {'{custom_name}'}
                </div>
              </div>
            </div>
            
          </div>
        ))}
        
        <button onClick={addRule} className="btn w-full py-4 transition" style={{ 
          border: '2px dashed var(--primary-color)', 
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          color: 'var(--primary-color)',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}>
          <Plus size={24} className="mr-2" /> Добавить новое правило
        </button>
      </div>

      <div className="flex justify-between items-center" style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
          <Database size={24} className="mr-2" /> Резервные копии базы данных
        </h2>
        <button 
          onClick={createBackup} 
          className="btn btn-primary"
          disabled={isBackupsLoading}
        >
          <Download size={20} className="mr-2" /> Создать бэкап
        </button>
      </div>

      <div className="flex flex-col" style={{ gap: '1rem' }}>
        {backups.length === 0 && (
          <div className="glass-panel text-center text-secondary py-8">
            Нет доступных резервных копий
          </div>
        )}
        
        {backups.map((backup) => (
          <div key={backup.filename} className="glass-panel flex justify-between items-center" style={{ padding: '1rem 1.5rem' }}>
            <div>
              <div className="font-bold mb-1">{backup.filename}</div>
              <div className="text-sm text-secondary flex gap-4">
                <span>Создано: {new Date(backup.created_at).toLocaleString()}</span>
                <span>Размер: {(backup.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setRestoreBackupModal(backup.filename)}
                className="btn btn-secondary"
                disabled={isBackupsLoading}
                title="Восстановить из этой копии"
              >
                <RefreshCw size={18} className="mr-2" /> Восстановить
              </button>
              <button 
                onClick={() => setDeleteBackupModal(backup.filename)}
                className="btn btn-danger"
                disabled={isBackupsLoading}
                title="Удалить копию"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal 
        isOpen={!!deleteBackupModal}
        title="Удалить бэкап?"
        onConfirm={() => deleteBackup(deleteBackupModal)}
        onCancel={() => setDeleteBackupModal(null)}
      />

      <ConfirmModal 
        isOpen={!!restoreBackupModal}
        title="Восстановить из этой копии? Текущие данные будут потеряны."
        onConfirm={() => restoreBackup(restoreBackupModal)}
        onCancel={() => setRestoreBackupModal(null)}
      />
    </div>
  );
}
