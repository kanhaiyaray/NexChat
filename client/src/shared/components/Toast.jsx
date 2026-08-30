import { useEffect, useState } from 'react';

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const typeStyles = {
    info: { color: 'var(--text)', borderColor: 'var(--border)' },
    success: { color: 'var(--green)', borderColor: 'rgba(52,211,153,0.3)' },
    error: { color: 'var(--rose)', borderColor: 'rgba(244,114,182,0.3)' },
    warning: { color: 'var(--gold)', borderColor: 'rgba(251,191,36,0.3)' },
  };

  return (
    <div 
      className={`toast ${type === 'error' ? 'error' : ''}`}
      style={typeStyles[type]}
    >
      {message}
    </div>
  );
};

export default Toast;
