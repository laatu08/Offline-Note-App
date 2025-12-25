const express = require('express');
const Note = require('../models/Note');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all notes (with optional timestamp filter)
router.get('/', auth, async (req, res) => {
  try {
    const since = parseInt(req.query.since) || 0;
    const notes = await Note.find({
      userId: req.userId,
      updatedAt: { $gt: since },
      deleted: false
    }).sort({ updatedAt: -1 });
    
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create note
router.post('/', auth, async (req, res) => {
  try {
    const noteData = {
      ...req.body,
      userId: req.userId
    };
    
    const note = new Note(noteData);
    await note.save();
    
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update note
router.put('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({ id: req.params.id, userId: req.userId });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    Object.assign(note, req.body);
    await note.save();
    
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete note
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({ id: req.params.id, userId: req.userId });
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    note.deleted = true;
    note.updatedAt = Date.now();
    await note.save();
    
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk sync
router.post('/sync', auth, async (req, res) => {
  try {
    const { notes } = req.body;
    const synced = [];
    const conflicts = [];
    
    for (const clientNote of notes) {
      const serverNote = await Note.findOne({ 
        id: clientNote.id, 
        userId: req.userId 
      });
      
      if (!serverNote) {
        // New note from client
        const note = new Note({ ...clientNote, userId: req.userId });
        await note.save();
        synced.push(note);
      } else if (serverNote.version > clientNote.version) {
        // Server has newer version - conflict
        conflicts.push({
          clientNote,
          serverNote
        });
      } else {
        // Client has newer version - update server
        Object.assign(serverNote, clientNote);
        await serverNote.save();
        synced.push(serverNote);
      }
    }
    
    res.json({ synced, conflicts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;