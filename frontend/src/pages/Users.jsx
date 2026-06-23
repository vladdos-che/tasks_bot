import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { UserPlus, Link as LinkIcon, Trash2, Edit2, Phone, MapPin, Copy } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import EditUserModal from '../components/EditUserModal';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  
  const [newName, setNewName] = useState('');
  
  const [editingUser, setEditingUser] = useState(null);

  const [inviteLink, setInviteLink] = useState(null);
  const [deleteModalUserId, setDeleteModalUserId] = useState(null);
  const [toast, setToast] = useState({ message: null, type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev.message === message ? { message: null, type: 'success' } : prev);
    }, 3000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [uRes, rRes] = await Promise.all([
        axios.get('/api/users', { headers }),
        axios.get('/api/roles', { headers })
      ]);
      setUsers(uRes.data);
      setRoles(rRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const names = newName.split(/[,;\n]/).map(n => n.trim()).filter(n => n.length > 0);
    
    if (names.length === 0) return;

    let successCount = 0;
    let skippedCount = 0;
    let errors = [];

    for (const name of names) {
      try {
        await axios.post('/api/users', { 
          full_name: name, 
          is_active: true,
          role_ids: []
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        successCount++;
      } catch (err) {
        if (err.response?.status === 400 && err.response.data.detail.includes('уже существует')) {
          skippedCount++;
        } else {
          console.error(err);
          if (err.response?.data?.detail) {
            errors.push(`${name}: ${err.response.data.detail}`);
          } else {
            errors.push(`${name}: Ошибка при добавлении`);
          }
        }
      }
    }

    setNewName('');
    fetchData();

    if (errors.length > 0) {
      showToast(`Успешно: ${successCount}. Пропущено: ${skippedCount}. Ошибки: ${errors.join('; ')}`, 'error');
    } else if (successCount > 0 || skippedCount > 0) {
      let msg = `Добавлено возвещателей: ${successCount}`;
      if (skippedCount > 0) msg += ` (уже существовали: ${skippedCount})`;
      showToast(msg, 'success');
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      await axios.put(`/api/users/${editingUser.id}`, {
        ...updatedData,
        is_active: true
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEditingUser(null);
      fetchData();
    } catch (err) {
      console.error(err);
      if (err.response?.data?.detail) {
        showToast(err.response.data.detail, 'error');
      } else {
        showToast('Ошибка сохранения', 'error');
      }
    }
  };

  const generateInvite = async (userId) => {
    try {
      const response = await axios.post(`/api/users/${userId}/generate_invite`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const newLink = `https://t.me/meettasks_bot${response.data.link}`;
      setInviteLink(newLink);
      
      // Auto-copy to clipboard
      try {
        await navigator.clipboard.writeText(newLink);
        showToast('Ссылка скопирована!');
      } catch (err) {
        console.error('Не удалось скопировать', err);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = (userId) => {
    setDeleteModalUserId(userId);
  };

  const handleDelete = async () => {
    if (!deleteModalUserId) return;
    try {
      await axios.delete(`/api/users/${deleteModalUserId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDeleteModalUserId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };



  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Возвещатели</h1>
      </div>

      <div className="glass-panel mb-4">
        <h3 className="mb-4">Добавить возвещателя</h3>
        <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl items-start">
            <textarea 
              className="form-input flex-1" 
              placeholder="Иванов Иван, Петров Петр (можно через запятую или с новой строки)" 
              value={newName} 
              onChange={e => {
                setNewName(e.target.value);
                e.target.style.height = 'inherit';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              style={{ minHeight: '46px', resize: 'none', overflow: 'hidden' }}
              required
            />
            <button type="submit" className="btn btn-primary whitespace-nowrap mt-1">
              <UserPlus size={18} /> Добавить
            </button>
          </div>
        </form>
      </div>

      {inviteLink && (
        <div className="glass-panel mb-4" style={{ borderColor: 'var(--success-color)' }}>
          <h4 className="text-success mb-2">Ссылка сгенерирована:</h4>
          <div className="flex gap-2 w-full">
            <input 
              type="text" 
              className="form-input flex-1" 
              value={inviteLink} 
              readOnly 
              onClick={e => e.target.select()} 
            />
            <button 
              className="btn btn-primary whitespace-nowrap"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteLink);
                  showToast('Ссылка скопирована!');
                } catch (err) {
                  console.error(err);
                }
              }}
              title="Скопировать"
            >
              <Copy size={18} /> Копировать
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel">
        <table className="glass-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя</th>
              <th>Роли</th>
              <th>Контакты</th>
              <th>Telegram ID</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>
                  <div className="font-medium">{u.full_name}</div>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {u.roles?.map(r => (
                      <span key={r.id} className="badge bg-secondary text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                        {r.name}
                      </span>
                    ))}
                    {(!u.roles || u.roles.length === 0) && <span className="text-secondary text-sm">-</span>}
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-1 text-sm">
                    {u.phone ? (
                      <div className="flex items-center gap-2 text-secondary"><Phone size={14} /> {u.phone}</div>
                    ) : null}
                    {u.address ? (
                      <div className="flex items-center gap-2 text-secondary"><MapPin size={14} /> {u.address}</div>
                    ) : null}
                    {!u.phone && !u.address && <span className="text-secondary opacity-50">-</span>}
                  </div>
                </td>
                <td>
                  {u.telegram_id ? (
                    <span className="text-success text-sm">Привязан</span>
                  ) : (
                    <span className="text-secondary text-sm">Не привязан</span>
                  )}
                </td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditClick(u)} className="btn" style={{ padding: '0.4rem 0.8rem', backgroundColor: 'rgba(255,255,255,0.1)' }} title="Редактировать">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => generateInvite(u.id)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }} title="Сгенерировать инвайт">
                      <LinkIcon size={16} />
                    </button>
                    <button onClick={() => confirmDelete(u.id)} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem' }} title="Удалить">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={!!deleteModalUserId}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalUserId(null)}
      />

      <EditUserModal
        isOpen={!!editingUser}
        user={editingUser}
        allRoles={roles}
        onClose={() => setEditingUser(null)}
        onSave={handleSaveEdit}
      />

      {toast.message && createPortal(
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          backgroundColor: toast.type === 'error' ? 'var(--danger-color)' : 'var(--success-color)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '0.75rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontWeight: 'bold'
        }} className="animate-fade-in">
          {toast.message}
        </div>,
        document.body
      )}
    </div>
  );
}
