import { API_URL } from '../config';

export const api = {
  // Auth
  async register(email, password, name) {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      return response.json();
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },
  
  async login(email, password) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return response.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Notes
  async getNotes(token, lastSyncedAt = 0) {
    try {
      const response = await fetch(`${API_URL}/notes?since=${lastSyncedAt}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Get notes error:', error);
      return []; // Return empty array on error to prevent sync issues
    }
  },
  
  async createNote(token, note) {
    try {
      const response = await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(note)
      });
      return response.json();
    } catch (error) {
      console.error('Create note error:', error);
      throw error;
    }
  },
  
  async updateNote(token, id, note) {
    try {
      const response = await fetch(`${API_URL}/notes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(note)
      });
      return response.json();
    } catch (error) {
      console.error('Update note error:', error);
      throw error;
    }
  },
  
  async deleteNote(token, id) {
    try {
      const response = await fetch(`${API_URL}/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Delete note error:', error);
      throw error;
    }
  },
  
  async syncNotes(token, notes) {
    try {
      const response = await fetch(`${API_URL}/notes/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Sync notes error:', error);
      return { synced: [], conflicts: [] }; // Return safe default on error
    }
  }
};