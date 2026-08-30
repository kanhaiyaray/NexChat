const Loading = ({ 
  size = 'medium', 
  text = 'Loading...', 
  fullScreen = false 
}) => {
  const sizeMap = {
    small: { fontSize: '14px', dotSize: '6px' },
    medium: { fontSize: '16px', dotSize: '8px' },
    large: { fontSize: '20px', dotSize: '10px' },
  };

  const styles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: 'var(--muted)',
    ...(fullScreen ? {
      position: 'fixed',
      inset: 0,
      background: 'rgba(7,11,20,0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
    } : {}),
  };

  const dotStyles = {
    display: 'flex',
    gap: '8px',
  };

  const dot = {
    width: sizeMap[size].dotSize,
    height: sizeMap[size].dotSize,
    borderRadius: '50%',
    background: 'var(--cyan)',
    animation: 'blink 1s infinite',
  };

  return (
    <div style={styles}>
      <div style={dotStyles}>
        <span style={{ ...dot, animationDelay: '0s' }} />
        <span style={{ ...dot, animationDelay: '0.2s' }} />
        <span style={{ ...dot, animationDelay: '0.4s' }} />
      </div>
      <span style={{ fontSize: sizeMap[size].fontSize }}>{text}</span>
    </div>
  );
};

export default Loading;
