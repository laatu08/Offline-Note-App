import { dbOperations } from './indexDB';
import { api } from './api';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this.listeners = [];
    this.deletedNotes = new Set(); // Track deleted note IDs
  }
  
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  notifyListeners(event) {
    this.listeners.forEach(callback => callback(event));
  }
  
  async startAutoSync(token, intervalMs = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Initial sync
    await this.sync(token);
    
    // Periodic sync
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.sync(token);
      }
    }, intervalMs);
  }
  
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  async sync(token) {
    if (this.isSyncing || !navigator.onLine) return;
    
    this.isSyncing = true;
    this.notifyListeners({ type: 'SYNC_START' });
    
    try {
      // Get pending local notes
      const pendingNotes = await dbOperations.getPendingNotes();
      
      // Filter out notes that were deleted locally
      const notesToSync = pendingNotes.filter(note => !this.deletedNotes.has(note.id));
      
      // Push pending notes to server
      if (notesToSync.length > 0) {
        const syncResult = await api.syncNotes(token, notesToSync);
        
        // Handle conflicts
        if (syncResult.conflicts && syncResult.conflicts.length > 0) {
          this.notifyListeners({ 
            type: 'CONFLICTS_DETECTED', 
            conflicts: syncResult.conflicts 
          });
        }
        
        // Update local notes with server response
        for (const note of syncResult.synced || []) {
          // Don't restore deleted notes
          if (!this.deletedNotes.has(note.id)) {
            await dbOperations.saveNote({
              ...note,
              syncStatus: 'synced',
              lastSyncedAt: Date.now()
            });
          }
        }
      }
      
      // Pull updates from server
      const allNotes = await dbOperations.getAllNotes();
      const lastSync = Math.max(...allNotes.map(n => n.lastSyncedAt || 0), 0);
      const serverNotes = await api.getNotes(token, lastSync);
      
      // Merge server notes
      for (const serverNote of serverNotes) {
        // Skip if this note was deleted locally
        if (this.deletedNotes.has(serverNote.id)) {
          continue;
        }
        
        const localNote = await dbOperations.getNote(serverNote.id);
        
        if (!localNote) {
          // New note from server - only add if not deleted locally
          await dbOperations.saveNote({
            ...serverNote,
            syncStatus: 'synced',
            lastSyncedAt: Date.now()
          });
        } else if (localNote.version < serverNote.version) {
          // Server has newer version
          if (localNote.syncStatus === 'pending') {
            // Conflict detected
            this.notifyListeners({
              type: 'CONFLICT_DETECTED',
              localNote,
              serverNote
            });
          } else {
            // Safe to update
            await dbOperations.saveNote({
              ...serverNote,
              syncStatus: 'synced',
              lastSyncedAt: Date.now()
            });
          }
        }
      }
      
      this.notifyListeners({ type: 'SYNC_SUCCESS' });
    } catch (error) {
      console.error('Sync error:', error);
      this.notifyListeners({ type: 'SYNC_ERROR', error });
    } finally {
      this.isSyncing = false;
    }
  }
  
  // Mark a note as deleted locally
  markAsDeleted(noteId) {
    this.deletedNotes.add(noteId);
  }
  
  // Clear deleted notes tracking (optional, for memory management)
  clearDeletedNotes() {
    this.deletedNotes.clear();
  }
}

export const syncManager = new SyncManager();