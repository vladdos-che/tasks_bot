import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Gift, Save, Play, RotateCcw, Plus, Trash2, GripVertical, Crown } from 'lucide-react';

export default function SpeakerGift() {
  const [queue, setQueue] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [config, setConfig] = useState({
    day_of_week: 1,
    time: '18:00',
    message_template: 'Напоминание: на этой неделе вы ответственны за подготовку подарка для докладчика.\n\nБрат/сестра: {user_name}',
  });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('success');
  const [isSaving, setIsSaving] = useState(false);

  // Drag state
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const daysOfWeek = [
    { label: 'Пн', value: 1 },
    { label: 'Вт', value: 2 },
    { label: 'Ср', value: 3 },
    { label: 'Чт', value: 4 },
    { label: 'Пт', value: 5 },
    { label: 'Сб', value: 6 },
    { label: 'Вс', value: 0 },
  ];

  const showStatus = (msg, type = 'success') => {
    setStatus(msg);
    setStatusType(type);
    setTimeout(() => setStatus(''), 4000);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [qRes, cRes, uRes] = await Promise.all([
        axios.get('/api/speaker-gift/queue', { headers }),
        axios.get('/api/speaker-gift/config', { headers }),
        axios.get('/api/users', { headers }),
      ]);
      setQueue(qRes.data);
      setConfig(cRes.data);
      setAllUsers(uRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Queue management ───────────────────────────────────

  const availableUsers = allUsers
    .filter(u => !queue.some(q => q.user_id === u.id))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const addToQueue = async () => {
    if (!selectedUserId) return;
    const newUserIds = [...queue.map(q => q.user_id), parseInt(selectedUserId)];
    try {
      const res = await axios.post('/api/speaker-gift/queue', { user_ids: newUserIds }, { headers });
      setQueue(res.data);
      setSelectedUserId('');
      showStatus('Добавлен в очередь');
    } catch (err) {
      showStatus('Ошибка добавления', 'error');
    }
  };

  const removeFromQueue = async (userId) => {
    const newUserIds = queue.filter(q => q.user_id !== userId).map(q => q.user_id);
    try {
      const res = await axios.post('/api/speaker-gift/queue', { user_ids: newUserIds }, { headers });
      setQueue(res.data);
      showStatus('Удалён из очереди');
    } catch (err) {
      showStatus('Ошибка удаления', 'error');
    }
  };

  const rotateQueue = async () => {
    try {
      const res = await axios.post('/api/speaker-gift/rotate', {}, { headers });
      setQueue(res.data);
      showStatus('Очередь сдвинута');
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Ошибка ротации', 'error');
    }
  };

  // ── Drag & Drop ────────────────────────────────────────

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setOverIndex(index);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }

    const reordered = [...queue];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    setQueue(reordered);
    setDragIndex(null);
    setOverIndex(null);

    // Persist the new order
    try {
      const res = await axios.post('/api/speaker-gift/queue', {
        user_ids: reordered.map(q => q.user_id)
      }, { headers });
      setQueue(res.data);
    } catch (err) {
      showStatus('Ошибка сохранения порядка', 'error');
      fetchAll();
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  // ── Touch drag support ─────────────────────────────────

  const touchState = useRef({ startY: 0, index: null, el: null });

  const handleTouchStart = (e, index) => {
    const touch = e.touches[0];
    touchState.current = { startY: touch.clientY, index, el: e.currentTarget };
    setDragIndex(index);
  };

  const handleTouchMove = useCallback((e) => {
    if (dragIndex === null) return;
    const touch = e.touches[0];
    const elements = document.querySelectorAll('[data-queue-item]');
    for (let i = 0; i < elements.length; i++) {
      const rect = elements[i].getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        setOverIndex(i);
        break;
      }
    }
  }, [dragIndex]);

  const handleTouchEnd = useCallback(async () => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const reordered = [...queue];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(overIndex, 0, moved);
      setQueue(reordered);

      try {
        const res = await axios.post('/api/speaker-gift/queue', {
          user_ids: reordered.map(q => q.user_id)
        }, { headers });
        setQueue(res.data);
      } catch (err) {
        showStatus('Ошибка сохранения порядка', 'error');
        fetchAll();
      }
    }
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, queue]);

  // ── Config ─────────────────────────────────────────────

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      await axios.post('/api/speaker-gift/config', config, { headers });
      showStatus('Настройки сохранены');
    } catch (err) {
      showStatus('Ошибка сохранения', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const forceSend = async () => {
    try {
      await axios.post('/api/speaker-gift/force-send', {}, { headers });
      showStatus('Уведомление отправлено текущему ответственному');
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Ошибка отправки', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Gift size={28} /> Подарок для докладчика
        </h1>
      </div>

      {status && (
        <div
          className="p-4 rounded text-center font-bold animate-fade-in"
          style={{
            backgroundColor: statusType === 'error'
              ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            color: statusType === 'error'
              ? 'var(--danger-color)' : 'var(--success-color)',
            marginBottom: '1.5rem',
          }}
        >
          {status}
        </div>
      )}

      {/* ── Settings card ─────────────────────────────── */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem' }}>Настройки рассылки</h2>

        <div className="flex gap-4 mb-4 flex-wrap">
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label className="form-label mb-2">День недели</label>
            <select
              className="form-input w-full"
              value={config.day_of_week}
              onChange={e => setConfig({ ...config, day_of_week: parseInt(e.target.value) })}
            >
              {daysOfWeek.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '140px' }}>
            <label className="form-label mb-2">Время</label>
            <input
              type="time"
              className="form-input w-full"
              value={config.time}
              onChange={e => setConfig({ ...config, time: e.target.value })}
            />
          </div>

          <div style={{ flex: 2, minWidth: '200px', display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button onClick={saveConfig} className="btn btn-primary flex-1" disabled={isSaving}>
              <Save size={18} /> Сохранить
            </button>
            <button
              onClick={forceSend}
              className="btn flex-1"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--success-color)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <Play size={18} /> Отправить сейчас
            </button>
          </div>
        </div>

        <div>
          <label className="form-label mb-2">Шаблон сообщения</label>
          <textarea
            className="form-input w-full"
            rows="4"
            value={config.message_template}
            onChange={e => setConfig({ ...config, message_template: e.target.value })}
            style={{ fontFamily: 'monospace' }}
          />
          <div className="text-xs text-secondary mt-2">
            Переменные: {'{user_name}'} — имя текущего ответственного
          </div>
        </div>
      </div>

      {/* ── Queue card ────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Очередь братьев</h2>
          <button
            onClick={rotateQueue}
            className="btn"
            disabled={queue.length < 2}
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              color: '#a78bfa',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}
            title="Сдвинуть: верхний → вниз"
          >
            <RotateCcw size={18} /> Ротировать
          </button>
        </div>

        {/* Add user to queue */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <select
            className="form-input flex-1"
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            <option value="">Выберите возвещателя…</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
          <button
            onClick={addToQueue}
            className="btn btn-primary"
            disabled={!selectedUserId}
          >
            <Plus size={18} /> Добавить
          </button>
        </div>

        {/* Queue list */}
        {queue.length === 0 ? (
          <div className="text-center text-secondary" style={{ padding: '3rem 1rem' }}>
            Очередь пуста. Добавьте возвещателей для ротации.
          </div>
        ) : (
          <div
            className="flex flex-col"
            style={{ gap: '0.5rem' }}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {queue.map((item, index) => (
              <div
                key={item.user_id}
                data-queue-item
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                className="flex items-center gap-3"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.75rem',
                  background: index === 0
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: overIndex === index
                    ? '2px solid var(--primary-color)'
                    : index === 0
                      ? '1px solid rgba(59, 130, 246, 0.3)'
                      : '1px solid var(--surface-border)',
                  opacity: dragIndex === index ? 0.4 : 1,
                  transition: 'all 0.2s ease',
                  cursor: 'grab',
                  userSelect: 'none',
                }}
              >
                <GripVertical size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />

                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    flexShrink: 0,
                    background: index === 0
                      ? 'linear-gradient(135deg, var(--primary-color), #8b5cf6)'
                      : 'rgba(255,255,255,0.1)',
                    color: index === 0 ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {index === 0 ? <Crown size={14} /> : index + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-medium" style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.user_name}
                  </div>
                  {index === 0 && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--primary-color)',
                      fontWeight: 500,
                    }}>
                      Текущий ответственный
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                  {item.telegram_id ? (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--success-color)',
                      }}
                    >
                      TG
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger-color)',
                      }}
                    >
                      Нет TG
                    </span>
                  )}
                  <button
                    onClick={() => removeFromQueue(item.user_id)}
                    className="btn btn-danger"
                    style={{ padding: '0.35rem' }}
                    title="Убрать из очереди"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {status && createPortal(
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            backgroundColor: statusType === 'error' ? 'var(--danger-color)' : 'var(--success-color)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontWeight: 'bold',
          }}
        >
          {status}
        </div>,
        document.body
      )}
    </div>
  );
}
