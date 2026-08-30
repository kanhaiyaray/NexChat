import { useState } from 'react';

const StatsCard = ({
  label,
  value,
  icon,
  trend,
  trendLabel,
  color = '#00e5ff',
  isLoading = false,
  onClick = null,
  className = '',
  subtitle = null,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isTrendUp = trend > 0;
  const trendColor = isTrendUp ? '#34d399' : '#f87171';
  const trendIcon = isTrendUp ? '↑' : '↓';

  const cardStyles = {
    background: 'linear-gradient(145deg, #141b2b, #0f172a)',
    borderRadius: '12px',
    padding: '20px 18px',
    border: `1px solid ${isHovered ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.06)'}`,
    boxShadow: isHovered ? '0 12px 32px rgba(0,229,255,0.08)' : '0 4px 16px rgba(0,0,0,0.3)',
    transition: 'all 0.25s ease',
    cursor: onClick ? 'pointer' : 'default',
    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
    position: 'relative',
    overflow: 'hidden',
    ...(className ? {} : {}),
  };

  const iconStyles = {
    fontSize: '24px',
    marginBottom: '8px',
    display: 'inline-block',
  };

  const labelStyles = {
    color: '#94a3b8',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 500,
    marginBottom: '4px',
  };

  const valueStyles = {
    fontSize: '28px',
    fontWeight: 700,
    color: '#e2e8f0',
    fontFamily: 'Syne, sans-serif',
    lineHeight: 1.2,
  };

  const trendStyles = {
    marginTop: '8px',
    fontSize: '13px',
    color: trendColor,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const subtitleStyles = {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px',
  };

  // Glow effect on hover
  const glowStyles = {
    position: 'absolute',
    top: '-50%',
    right: '-50%',
    width: '100%',
    height: '100%',
    background: `radial-gradient(circle, ${color}08 0%, transparent 70%)`,
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.4s ease',
    pointerEvents: 'none',
  };

  if (isLoading) {
    return (
      <div style={cardStyles}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ width: '60%', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          <div style={{ width: '40%', height: '28px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', animation: 'pulse 1.5s infinite 0.3s' }} />
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={cardStyles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={className}
    >
      <div style={glowStyles} />
      
      {icon && <div style={iconStyles}>{icon}</div>}
      
      <div style={labelStyles}>{label}</div>
      
      <div style={valueStyles}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      
      {subtitle && <div style={subtitleStyles}>{subtitle}</div>}
      
      {trend !== undefined && trend !== null && (
        <div style={trendStyles}>
          <span>{trendIcon}</span>
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span style={{ color: '#64748b', marginLeft: '4px' }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
