const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1000';

export const apiClient = {
  async get(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return this.handleResponse(response);
  },

  async post(endpoint, data, options = {}) {
    const isFormData = data instanceof FormData;
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      ...options,
      body: isFormData ? data : JSON.stringify(data),
      headers: isFormData
        ? { ...(options.headers || {}) }
        : { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    return this.handleResponse(response);
  },

  async put(endpoint, data, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  },

  async delete(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return this.handleResponse(response);
  },

  async handleResponse(response) {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const data = await response.json();
        if (data.error) errorMessage = data.error;
      } catch (e) {
        // Ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },
};

export default apiClient;
