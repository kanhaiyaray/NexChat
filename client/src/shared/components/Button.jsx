import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  type = 'button',
  fullWidth = false,
  ...props
}) => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    border: 'none',
    opacity: disabled || loading ? '0.6' : '1',
    width: fullWidth ? '100%' : 'auto',
  };

  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, var(--cyan), var(--violet))',
      color: '#070b14',
      boxShadow: '0 4px 16px rgba(61,214,245,.25)',
    },
    secondary: {
      background: 'rgba(255,255,255,0.06)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
    },
    danger: {
      background: 'rgba(244,114,182,0.15)',
      color: 'var(--rose)',
      border: '1px solid rgba(244,114,182,0.2)',
    },
    success: {
      background: 'rgba(52,211,153,0.15)',
      color: 'var(--green)',
      border: '1px solid rgba(52,211,153,0.2)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text)',
    },
  };

  const sizeStyles = {
    small: { padding: '6px 12px', fontSize: '12px' },
    medium: { padding: '10px 20px', fontSize: '14px' },
    large: { padding: '14px 28px', fontSize: '16px' },
  };

  const styles = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
  };

  return (
    <button
      type={type}
      style={styles}
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="spin-icon">⏳</span>}
      {children}
    </button>
  );
};

export default Button;
