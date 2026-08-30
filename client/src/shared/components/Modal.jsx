import { useEffect, useRef } from 'react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'medium',
  closeOnOverlayClick = true,
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    small: { maxWidth: '400px' },
    medium: { maxWidth: '480px' },
    large: { maxWidth: '600px' },
    full: { maxWidth: '90vw', maxHeight: '90vh' },
  };

  return (
    <div 
      className="profile-modal-overlay"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div 
        ref={modalRef}
        className="profile-modal"
        style={sizeStyles[size]}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-modal-header">
          <h3>{title}</h3>
          <button className="profile-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="profile-modal-body">
          {children}
        </div>

        {footer && (
          <div className="profile-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
