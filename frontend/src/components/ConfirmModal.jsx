import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmModal({ isOpen, title = "Удалить?", onConfirm, onCancel }) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the confirm button or just attach listener to document
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onConfirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      // Try to focus something so focus isn't lost, or focus the confirm button
      if (confirmBtnRef.current) {
        confirmBtnRef.current.focus({ preventScroll: true });
      }
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '300px' }}>
        <h3 className="mb-6 text-center">{title}</h3>
        <div className="flex gap-4 justify-center">
          <button onClick={onCancel} className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            Нет
          </button>
          <button 
            ref={confirmBtnRef}
            onClick={onConfirm} 
            className="btn btn-danger"
          >
            Да
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
