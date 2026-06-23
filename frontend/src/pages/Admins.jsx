import { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Save, Trash2, ShieldCheck, Shield } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // { username, is_superadmin }
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [deleteModalAdminId, setDeleteModalAdminId] = useState(null);

  // For updating password
  const [updatePassword, setUpdatePassword] = useState('');
  const [updateAdminId, setUpdateAdminId] = useState('');

  useEffect(() => {
    fetchCurrentUser();
    fetchAdmins();
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('/api/auth/me', { headers: authHeaders() });
      setCurrentUser(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axios.get('/api/admins', { headers: authHeaders() });
      setAdmins(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await axios.post('/api/admins', { username: newUsername, password: newPassword }, {
        headers: authHeaders()
      });
      setNewUsername('');
      setNewPassword('');
      setSuccessMsg('Администратор успешно создан');
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка создания');
    }
  };

  const handleUpdatePassword = async (e, adminId) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await axios.put(`/api/admins/${adminId}`, { password: updatePassword }, {
        headers: authHeaders()
      });
      setUpdatePassword('');
      setUpdateAdminId('');
      setSuccessMsg('Пароль успешно изменён');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка обновления');
    }
  };

  const confirmDelete = (adminId) => {
    setDeleteModalAdminId(adminId);
  };

  const handleDelete = async () => {
    if (!deleteModalAdminId) return;
    setError('');
    setSuccessMsg('');
    try {
      await axios.delete(`/api/admins/${deleteModalAdminId}`, { headers: authHeaders() });
      setDeleteModalAdminId(null);
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка удаления');
      setDeleteModalAdminId(null);
    }
  };

  const isSuperadmin = currentUser?.is_superadmin;

  // Обычный admin может менять пароль только у себя
  const canChangePassword = (admin) => {
    if (!currentUser) return false;
    if (isSuperadmin) return true;
    return admin.username === currentUser.username;
  };

  return (
    <div>
      <h1 className="mb-4">Администраторы системы</h1>

      {error && <div className="text-danger mb-4 p-4 glass-panel" style={{ borderColor: 'var(--danger-color)' }}>{error}</div>}
      {successMsg && <div className="text-success mb-4 p-4 glass-panel" style={{ borderColor: 'var(--success-color)' }}>{successMsg}</div>}

      {/* Форма создания — только для суперадмина */}
      {isSuperadmin && (
        <div className="flex gap-4 mb-4">
          <div className="glass-panel" style={{ flex: 1 }}>
            <h3 className="mb-4">Создать администратора</h3>
            <form onSubmit={handleCreateAdmin} className="flex flex-col gap-4">
              <div className="form-group mb-0">
                <label className="form-label">Логин</label>
                <input
                  type="text"
                  className="form-input"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Пароль</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary mt-2">
                <UserPlus size={18} /> Добавить
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="glass-panel">
        <h3 className="mb-4">Список администраторов</h3>
        <table className="glass-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Логин</th>
              <th>Роль</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>
                  {a.username}
                  {a.username === currentUser?.username && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', opacity: 0.6 }}>(вы)</span>
                  )}
                </td>
                <td>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.82rem',
                    color: a.is_superadmin ? 'var(--primary-color)' : 'var(--text-secondary)',
                    fontWeight: a.is_superadmin ? 600 : 400,
                  }}>
                    {a.is_superadmin
                      ? <><ShieldCheck size={14} /> Главный</>
                      : <><Shield size={14} /> Администратор</>
                    }
                  </span>
                </td>
                <td>
                  <div className="flex gap-4 items-center">
                    {canChangePassword(a) && (
                      updateAdminId === a.id ? (
                        <form onSubmit={(e) => handleUpdatePassword(e, a.id)} className="flex gap-2">
                          <input
                            type="password"
                            className="form-input"
                            placeholder="Новый пароль"
                            value={updatePassword}
                            onChange={e => setUpdatePassword(e.target.value)}
                            required
                            style={{ padding: '0.4rem', minHeight: 'auto' }}
                          />
                          <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }}>
                            <Save size={16} /> Сохранить
                          </button>
                          <button type="button" onClick={() => setUpdateAdminId('')} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem' }}>
                            Отмена
                          </button>
                        </form>
                      ) : (
                        <button onClick={() => setUpdateAdminId(a.id)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }}>
                          Сменить пароль
                        </button>
                      )
                    )}

                    {/* Удаление — только суперадмин и только чужих */}
                    {isSuperadmin && !a.is_superadmin && (
                      <button
                        onClick={() => confirmDelete(a.id)}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.8rem' }}
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteModalAdminId}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalAdminId(null)}
      />
    </div>
  );
}
