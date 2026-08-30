const TypingIndicator = ({ typing }) => {
  if (!typing) return null;

  return (
    <div className="typing-bar">
      <div className="typing-dots">
        <span />
        <span />
        <span />
      </div>
      {typing} is typing...
    </div>
  );
};

export default TypingIndicator;
