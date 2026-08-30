export class MessageBuffer {
  constructor() {
    this.buffer = [];
    this.isHistoryLoaded = false;
    this.onFlush = null;
  }

  setHistoryLoaded(loaded) {
    this.isHistoryLoaded = loaded;
    if (loaded && this.buffer.length > 0) {
      this.flush();
    }
  }

  add(message) {
    if (!this.isHistoryLoaded) {
      this.buffer.push(message);
      return false;
    }
    return true;
  }

  flush() {
    if (this.buffer.length === 0) return [];
    const messages = [...this.buffer];
    this.buffer = [];
    return messages;
  }

  clear() {
    this.buffer = [];
  }

  get length() {
    return this.buffer.length;
  }

  get messages() {
    return this.buffer;
  }
}

export const createMessageBuffer = () => new MessageBuffer();

export default MessageBuffer;
