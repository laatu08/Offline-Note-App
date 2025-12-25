const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    default: 'Untitled Note'
  },
  content: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Number,
    required: true
  },
  updatedAt: {
    type: Number,
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  deleted: {
    type: Boolean,
    default: false
  }
});

noteSchema.index({ userId: 1, updatedAt: -1 });
noteSchema.index({ id: 1, userId: 1 });

module.exports = mongoose.model('Note', noteSchema);