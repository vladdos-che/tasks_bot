import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldPlus, PlusCircle, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [matrix, setMatrix] = useState([]);
  
  const [newRole, setNewRole] = useState('');
  const [newTaskCode, setNewTaskCode] = useState('');
  const [newTaskName, setNewTaskName] = useState('');

  const [deleteModalTaskId, setDeleteModalTaskId] = useState(null);
  const [deleteModalRoleId, setDeleteModalRoleId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [rRes, tRes, mRes] = await Promise.all([
        axios.get('/api/roles', { headers }),
        axios.get('/api/tasks', { headers }),
        axios.get('/api/roles/matrix', { headers })
      ]);
      setRoles(rRes.data);
      setTasks(tRes.data);
      setMatrix(mRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/roles', { name: newRole }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNewRole('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/tasks', { 
        code: newTaskCode, 
        name: newTaskName,
        requires_custom_name: false,
        requires_partner: false,
        is_weekday: true,
        is_weekend: true
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNewTaskCode('');
      setNewTaskName('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMatrix = async (roleId, taskId, currentStatus) => {
    try {
      await axios.post('/api/roles/matrix', {
        role_id: roleId,
        task_id: taskId,
        enabled: !currentStatus
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTaskProperty = async (taskId, field, currentValue) => {
    try {
      await axios.put(`/api/tasks/${taskId}`, {
        [field]: !currentValue
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteModalTaskId) return;
    try {
      await axios.delete(`/api/tasks/${deleteModalTaskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDeleteModalTaskId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveTask = async (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === tasks.length - 1) return;

    const newTasks = [...tasks];
    const temp = newTasks[index];
    newTasks[index] = newTasks[index + direction];
    newTasks[index + direction] = temp;
    
    setTasks(newTasks);

    try {
      const taskIds = newTasks.map(t => t.id);
      await axios.post('/api/tasks/reorder', { task_ids: taskIds }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (err) {
      console.error(err);
      fetchData(); // revert on failure
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteModalRoleId) return;
    try {
      await axios.delete(`/api/roles/${deleteModalRoleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDeleteModalRoleId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const hasPermission = (roleId, taskId) => {
    return matrix.some(m => m.role_id === roleId && m.task_id === taskId);
  };

  return (
    <div>
      <h1 className="mb-4">Управление Ролями и Заданиями</h1>

      <div className="flex gap-4 mb-4">
        <div className="glass-panel" style={{ flex: 1 }}>
          <h3 className="mb-4">Добавить Роль</h3>
          <form onSubmit={handleCreateRole} className="flex gap-4 items-center">
            <input 
              type="text" 
              className="form-input" 
              placeholder="Название роли" 
              value={newRole} 
              onChange={e => setNewRole(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">
              <ShieldPlus size={18} />
            </button>
          </form>
        </div>

        <div className="glass-panel" style={{ flex: 1 }}>
          <h3 className="mb-4">Добавить Задание</h3>
          <form onSubmit={handleCreateTask} className="flex gap-4 items-center">
            <input 
              type="text" 
              className="form-input" 
              placeholder="Код (МОЛ1)" 
              value={newTaskCode} 
              onChange={e => setNewTaskCode(e.target.value)}
              required
              style={{ width: '100px' }}
            />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Название" 
              value={newTaskName} 
              onChange={e => setNewTaskName(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'center' }}>
              <PlusCircle size={18} />
            </button>
          </form>
        </div>
      </div>

      <div className="glass-panel">
        <h3 className="mb-4">Матрица Доступов</h3>
        <div style={{ overflow: 'auto', maxHeight: '60vh', position: 'relative' }}>
          <table className="glass-table text-center" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ 
                  textAlign: 'left', 
                  position: 'sticky', 
                  top: 0, 
                  left: 0, 
                  zIndex: 20, 
                  background: 'rgba(30, 41, 59, 1)', 
                  borderRight: '1px solid var(--surface-border)', 
                  borderBottom: '1px solid var(--surface-border)',
                  minWidth: '250px' 
                }}>
                  Задание \ Роль
                </th>
                {roles.map(r => (
                  <th key={r.id} style={{ 
                    position: 'sticky', 
                    top: 0, 
                    zIndex: 10, 
                    background: 'rgba(30, 41, 59, 1)',
                    borderBottom: '1px solid var(--surface-border)'
                  }}>
                    <div className="flex items-center justify-center gap-2">
                      <span>{r.name}</span>
                      <button 
                        onClick={() => setDeleteModalRoleId(r.id)} 
                        className="btn btn-danger" 
                        style={{ padding: '0.2rem 0.4rem' }} 
                        title="Удалить роль"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, index) => (
                <tr key={t.id}>
                  <td style={{ 
                    textAlign: 'left', 
                    position: 'sticky', 
                    left: 0, 
                    zIndex: 10, 
                    background: 'rgba(30, 41, 59, 1)', 
                    borderRight: '1px solid var(--surface-border)',
                    borderBottom: '1px solid var(--surface-border)'
                  }}>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5 mr-2">
                          <button 
                            className="text-secondary hover:text-white transition"
                            onClick={() => handleMoveTask(index, -1)}
                            disabled={index === 0}
                            style={{ opacity: index === 0 ? 0.3 : 1, padding: 0 }}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button 
                            className="text-secondary hover:text-white transition"
                            onClick={() => handleMoveTask(index, 1)}
                            disabled={index === tasks.length - 1}
                            style={{ opacity: index === tasks.length - 1 ? 0.3 : 1, padding: 0 }}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                        <span>{t.name} ({t.code})</span>
                        <button 
                          onClick={() => setDeleteModalTaskId(t.id)} 
                          className="btn btn-danger" 
                          style={{ padding: '0.2rem 0.4rem', marginLeft: 'auto' }} 
                          title="Удалить задание"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex gap-4 text-xs text-secondary mt-1">
                        <label className="flex items-center gap-1 cursor-pointer" title="Требуется напарник">
                          <input 
                            type="checkbox" 
                            checked={t.requires_partner} 
                            onChange={() => handleToggleTaskProperty(t.id, 'requires_partner', t.requires_partner)}
                          />
                          👥 Напарник
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer" title="Требуется уточнение/название (вместо номера)">
                          <input 
                            type="checkbox" 
                            checked={t.requires_custom_name} 
                            onChange={() => handleToggleTaskProperty(t.id, 'requires_custom_name', t.requires_custom_name)}
                          />
                          ✏️ Название
                        </label>
                      </div>
                    </div>
                  </td>
                  {roles.map(r => {
                    const checked = hasPermission(r.id, t.id);
                    return (
                      <td key={r.id}>
                        <input 
                          type="checkbox" 
                          checked={checked}
                          onChange={() => toggleMatrix(r.id, t.id, checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!deleteModalTaskId}
        onConfirm={handleDeleteTask}
        onCancel={() => setDeleteModalTaskId(null)}
      />

      <ConfirmModal 
        isOpen={!!deleteModalRoleId}
        onConfirm={handleDeleteRole}
        onCancel={() => setDeleteModalRoleId(null)}
      />
    </div>
  );
}
