import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function EditUserModal({ isOpen, user, allRoles, onClose, onSave }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [roleIds, setRoleIds] = useState([]);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.full_name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setRoleIds(user.roles ? user.roles.map(r => r.id) : []);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      full_name: name,
      phone: phone || null,
      address: address || null,
      role_ids: roleIds
    });
  };

  const toggleRole = (roleId) => {
    if (roleIds.includes(roleId)) {
      setRoleIds(roleIds.filter(id => id !== roleId));
    } else {
      setRoleIds([...roleIds, roleId]);
    }
  };

  const formatPhoneNumber = (value) => {
    if (!value) return '';
    let digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    if (digits[0] === '9') digits = '7' + digits;
    if (digits[0] === '8') digits = '7' + digits.slice(1);
    if (digits[0] !== '7') digits = '7' + digits;

    let res = '+7';
    const rest = digits.slice(1, 11);
    
    if (rest.length > 0) res += ' (' + rest.substring(0, 3);
    if (rest.length >= 4) res += ') ' + rest.substring(3, 6);
    if (rest.length >= 7) res += '-' + rest.substring(6, 8);
    if (rest.length >= 9) res += '-' + rest.substring(8, 10);
    
    return res;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  return createPortal(
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
        <h3 className="mb-4">Редактировать: {user.full_name}</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          <div className="form-group mb-0">
            <label className="form-label">Имя и Фамилия</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Телефон (необязательно)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="+7 (XXX) XXX-XX-XX"
              value={phone} 
              onChange={handlePhoneChange}
            />
          </div>
          
          <div className="form-group mb-0">
            <label className="form-label">Адрес (необязательно)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Город, Улица..."
              value={address} 
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label mb-2">Роли</label>
            <div className="flex flex-wrap gap-2 p-3 rounded" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--surface-border)' }}>
              {allRoles.map(r => {
                const isSelected = roleIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    className="btn"
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.875rem',
                      backgroundColor: isSelected ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      border: isSelected ? '1px solid var(--primary-color)' : '1px solid var(--surface-border)',
                      borderRadius: '0.5rem'
                    }}
                  >
                    {r.name}
                  </button>
                );
              })}
              {allRoles.length === 0 && <span className="text-secondary text-sm italic">Нет доступных ролей</span>}
            </div>
          </div>

          <div className="flex gap-4 justify-end mt-4">
            <button type="button" onClick={onClose} className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
