const AVATAR_COLORS = [
  ['rgba(61,214,245,.25)', '#3dd6f5'],
  ['rgba(167,139,250,.25)', '#a78bfa'],
  ['rgba(244,114,182,.25)', '#f472b6'],
  ['rgba(52,211,153,.25)', '#34d399'],
  ['rgba(251,191,36,.25)', '#fbbf24'],
  ['rgba(248,113,113,.25)', '#f87171'],
];

const Avatar = ({
  name = 'User',
  imageUrl = null,
  size = 32,
  status = null,
  className = '',
}) => {
  const getAvatarStyle = (name) => {
    const [bg, color] = AVATAR_COLORS[name?.charCodeAt(0) % AVATAR_COLORS.length] || AVATAR_COLORS[0];
    return { background: bg, color };
  };

  const initials = (name) => {
    return (name || 'U').slice(0, 2).toUpperCase();
  };

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    flexShrink: 0,
    fontSize: size * 0.4,
    ...getAvatarStyle(name),
    ...(imageUrl ? {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: 'transparent',
    } : {}),
  };

  return (
    <div className={`avatar ${className}`} style={avatarStyle}>
      {!imageUrl && initials(name)}
      {status === 'online' && (
        <div style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: '50%',
          background: '#34d399',
          border: '2px solid var(--surface)',
        }} />
      )}
    </div>
  );
};

export default Avatar;
