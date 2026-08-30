import MessageItem from './MessageItem.jsx';

const MessageList = ({
  messages,
  username,
  reactions,
  readReceipts,
  activePicker,
  setActivePicker,
  onReaction,
  onContextMenu,
  onJumpToMessage,
  onOpenThread,
  editingMessageId,
  editingDraft,
  setEditingDraft,
  onSaveEdit,
  onCancelEdit,
  editSaving,
}) => {
  const displayRoom = 'private';

  return (
    <>
      <div className="date-divider">PRIVATE CHAT · #{displayRoom}</div>

      {messages.map((msg, index) => {
        const isOwn = msg.sender === username;
        const showAvatar = index === 0 || messages[index - 1]?.sender !== msg.sender;
        const msgReactions = reactions[msg.id] || {};
        const isEditing = editingMessageId === msg.id;

        return (
          <MessageItem
            key={msg.id}
            message={msg}
            isOwn={isOwn}
            showAvatar={showAvatar}
            reactions={msgReactions}
            readReceipts={readReceipts}
            activePicker={activePicker}
            setActivePicker={setActivePicker}
            onReaction={onReaction}
            onContextMenu={onContextMenu}
            onOpenThread={onOpenThread}
            isEditing={isEditing}
            editingDraft={editingDraft}
            setEditingDraft={setEditingDraft}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            editSaving={editSaving}
            username={username}
          />
        );
      })}
    </>
  );
};

export default MessageList;
