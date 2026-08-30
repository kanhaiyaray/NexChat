export const scrollToBottom = (element, behavior = 'smooth') => {
  if (!element) return;
  element.scrollTo({
    top: element.scrollHeight,
    behavior,
  });
};

export const scrollToMessage = (element, messageId, behavior = 'smooth') => {
  if (!element) return;
  const messageEl = element.querySelector(`[data-msg-id="${messageId}"]`);
  if (messageEl) {
    messageEl.scrollIntoView({ behavior, block: 'center' });
    return true;
  }
  return false;
};

export const isAtBottom = (element, threshold = 10) => {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
};

export const shouldAutoScroll = (element) => {
  return isAtBottom(element);
};

export class ScrollManager {
  constructor(element) {
    this.element = element;
    this.shouldAutoScroll = true;
    this.pendingTarget = null;
  }

  scrollToBottom(behavior = 'smooth') {
    if (!this.element) return;
    this.element.scrollTo({
      top: this.element.scrollHeight,
      behavior,
    });
  }

  scrollToMessage(messageId, behavior = 'smooth') {
    if (!this.element) return false;
    const messageEl = this.element.querySelector(`[data-msg-id="${messageId}"]`);
    if (messageEl) {
      messageEl.scrollIntoView({ behavior, block: 'center' });
      return true;
    }
    return false;
  }

  handleNewMessage() {
    if (this.shouldAutoScroll) {
      this.scrollToBottom();
    }
  }

  setAutoScroll(enabled) {
    this.shouldAutoScroll = enabled;
  }

  setPendingTarget(messageId) {
    this.pendingTarget = messageId;
  }

  checkPendingTarget() {
    if (this.pendingTarget) {
      const found = this.scrollToMessage(this.pendingTarget);
      if (found) {
        this.pendingTarget = null;
      }
      return found;
    }
    return false;
  }

  isAtBottom(threshold = 10) {
    if (!this.element) return true;
    return this.element.scrollHeight - this.element.scrollTop - this.element.clientHeight < threshold;
  }
}

export default ScrollManager;
