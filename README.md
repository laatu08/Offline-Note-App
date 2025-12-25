# Offline-First Notes Application

A full-stack, offline-first note-taking application with real-time synchronization, conflict resolution, and rich text editing capabilities.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Data Flow](#data-flow)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Detailed Component Breakdown](#detailed-component-breakdown)
- [Operation Flows](#operation-flows)
- [Setup and Installation](#setup-and-installation)

---

## Architecture Overview

This application follows an **offline-first architecture** pattern, meaning it works seamlessly without an internet connection and synchronizes data when connectivity is restored.

### Key Architectural Principles

1. **Local-First**: All operations happen locally in IndexedDB first
2. **Eventual Consistency**: Changes propagate to the server when online
3. **Conflict Resolution**: Version-based conflict detection and resolution
4. **Optimistic UI**: Immediate feedback without waiting for server responses
5. **Background Sync**: Automatic synchronization at regular intervals

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │              │    │              │    │              │  │
│  │   React UI   │───▶│ SyncManager  │───▶│  IndexedDB   │  │
│  │              │    │              │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                               │
│         │                    │                               │
│         └────────────────────┼───────────────────────────────┤
│                              │            API Layer          │
│                              ▼                               │
└──────────────────────────────┼───────────────────────────────┘
                               │
                          HTTP/REST
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                         SERVER SIDE                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │              │    │              │    │              │  │
│  │   Express    │───▶│   Routes     │───▶│   MongoDB    │  │
│  │  Middleware  │    │  Controllers │    │   Database   │  │
│  │              │    │              │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **IndexedDB** - Client-side database for offline storage
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

---

## Data Flow

### Complete Data Flow Diagram

```
USER ACTION
    ↓
┌───────────────────────────────────────────────────────────┐
│ 1. USER CREATES/UPDATES/DELETES NOTE                      │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ 2. REACT STATE UPDATED (title, content)                   │
│    - Triggers auto-save after 1 second of inactivity      │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ 3. SAVE TO INDEXEDDB                                       │
│    - Note marked as 'pending' sync status                 │
│    - Version number incremented                           │
│    - updatedAt timestamp set                              │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ 4. CHECK ONLINE STATUS                                     │
│    - If ONLINE: Trigger SyncManager                       │
│    - If OFFLINE: Wait for connectivity                    │
└───────────────────────────────────────────────────────────┘
    ↓ (if online)
┌───────────────────────────────────────────────────────────┐
│ 5. SYNCMANAGER PROCESSES                                   │
│    - Collects all pending notes from IndexedDB            │
│    - Sends to server via /api/notes/sync                  │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ 6. SERVER PROCESSES SYNC REQUEST                          │
│    - Compares versions with database                      │
│    - Resolves conflicts                                   │
│    - Updates MongoDB                                      │
│    - Returns synced notes and conflicts                   │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ 7. CLIENT RECEIVES RESPONSE                                │
│    - Updates IndexedDB with synced notes                  │
│    - Changes sync status to 'synced'                      │
│    - Sets lastSyncedAt timestamp                          │
│    - Notifies UI listeners                                │
└───────────────────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────────────────┐
│ 8. UI UPDATES                                              │
│    - Shows "Synced" indicator                             │
│    - Updates note list with latest data                   │
└───────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### File Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Auth.jsx              # Authentication UI component
│   ├── services/
│   │   ├── api.js                # API communication layer
│   │   ├── indexDB.js            # IndexedDB operations
│   │   └── syncManager.js        # Synchronization logic
│   ├── utils/
│   │   └── helpers.js            # Utility functions
│   ├── App.jsx                   # Main application component
│   ├── config.js                 # Configuration settings
│   └── main.jsx                  # Application entry point
```

---

## Backend Architecture

### File Structure

```
server/
├── config/
│   └── db.js                     # MongoDB connection
├── middleware/
│   └── auth.js                   # JWT authentication middleware
├── models/
│   ├── User.js                   # User data model
│   └── Note.js                   # Note data model
├── routes/
│   ├── auth.js                   # Authentication routes
│   └── notes.js                  # Notes CRUD routes
└── server.js                     # Express server setup
```

---

## Detailed Component Breakdown

## 1. IndexedDB Service (`frontend/src/services/indexDB.js`)

IndexedDB is a low-level API for client-side storage of significant amounts of structured data. This service manages all local database operations.

### Database Schema

```javascript
Database Name: 'OfflineNotesDB'
Version: 1

Object Store: 'notes'
├── Key Path: 'id'
├── Indexes:
│   ├── 'updatedAt' - For sorting by modification time
│   ├── 'syncStatus' - For filtering pending notes
│   └── 'userId' - For user-specific queries
```

### Key Functions

#### `initDB()`
**Purpose**: Initializes or upgrades the IndexedDB database

**Process**:
1. Opens connection to IndexedDB
2. Creates object store if it doesn't exist
3. Creates indexes for efficient querying
4. Returns database instance

**When Called**: Automatically before any database operation

---

#### `dbOperations.getAllNotes()`
**Purpose**: Retrieves all notes for the current user

**Process**:
```javascript
1. Open database connection
2. Start read-only transaction on 'notes' store
3. Execute getAll() operation
4. Return array of all notes
```

**Returns**: `Promise<Note[]>`

**Usage**: Initial load, after sync, after operations

---

#### `dbOperations.getNote(id)`
**Purpose**: Retrieves a specific note by ID

**Parameters**:
- `id` (string): Unique note identifier

**Process**:
```javascript
1. Open database connection
2. Start read-only transaction
3. Execute get(id) on object store
4. Return note or undefined
```

**Returns**: `Promise<Note | undefined>`

---

#### `dbOperations.saveNote(note)`
**Purpose**: Creates or updates a note in IndexedDB

**Parameters**:
- `note` (object): Complete note object with all properties

**Note Structure**:
```javascript
{
  id: string,                    // Unique identifier
  userId: string,                // Owner's user ID
  title: string,                 // Note title
  content: string,               // Note content (HTML)
  createdAt: number,             // Creation timestamp
  updatedAt: number,             // Last modification timestamp
  lastSyncedAt: number | null,   // Last sync timestamp
  syncStatus: 'pending' | 'synced', // Sync state
  version: number                // Version for conflict resolution
}
```

**Process**:
```javascript
1. Open database connection
2. Start readwrite transaction
3. Execute put() operation (insert or update)
4. Return operation result
```

**Returns**: `Promise<string>` (note ID)

---

#### `dbOperations.deleteNote(id)`
**Purpose**: Permanently removes a note from IndexedDB

**Parameters**:
- `id` (string): Note identifier to delete

**Process**:
```javascript
1. Open database connection
2. Start readwrite transaction
3. Execute delete(id) operation
4. Complete transaction
```

**Returns**: `Promise<void>`

**Important**: This is a hard delete. The note is removed from local storage immediately.

---

#### `dbOperations.getPendingNotes()`
**Purpose**: Retrieves all notes that need to be synced to the server

**Process**:
```javascript
1. Open database connection
2. Access 'syncStatus' index
3. Query for notes with syncStatus === 'pending'
4. Return matching notes
```

**Returns**: `Promise<Note[]>`

**Usage**: Called by SyncManager during synchronization

---

#### `dbOperations.clearAllNotes()`
**Purpose**: Removes all notes from local storage (used for logout/reset)

**Process**:
```javascript
1. Open database connection
2. Start readwrite transaction
3. Execute clear() on object store
4. Complete transaction
```

**Returns**: `Promise<void>`

---

## 2. SyncManager (`frontend/src/services/syncManager.js`)

The SyncManager is the heart of the offline-first architecture. It handles all synchronization between IndexedDB and the server.

### Architecture

```
SyncManager
├── State Management
│   ├── isSyncing: boolean          # Prevents concurrent syncs
│   ├── syncInterval: NodeJS.Timeout # Auto-sync timer
│   ├── listeners: Function[]        # Event subscribers
│   └── deletedNotes: Set<string>   # Tracks deleted notes
│
├── Public Methods
│   ├── startAutoSync()             # Begins periodic syncing
│   ├── stopAutoSync()              # Stops periodic syncing
│   ├── sync()                      # Performs synchronization
│   ├── markAsDeleted()             # Tracks deletions
│   └── addListener()               # Registers event listeners
│
└── Internal Logic
    ├── Push pending changes        # Upload local changes
    ├── Pull server updates         # Download remote changes
    ├── Conflict detection          # Version comparison
    └── Merge resolution            # Update local/remote data
```

### Detailed Method Breakdown

#### `startAutoSync(token, intervalMs = 30000)`
**Purpose**: Starts automatic periodic synchronization

**Parameters**:
- `token` (string): JWT authentication token
- `intervalMs` (number): Interval between syncs (default 30 seconds)

**Process**:
```javascript
1. Clear any existing sync interval
2. Perform immediate initial sync
3. Set up setInterval for periodic syncing
4. Store interval reference for cleanup
```

**Sync Trigger Conditions**:
- Every 30 seconds (default)
- Only when navigator.onLine is true
- Not already syncing

---

#### `stopAutoSync()`
**Purpose**: Stops periodic synchronization

**Process**:
```javascript
1. Clear the sync interval timer
2. Reset syncInterval to null
3. Prevent further automatic syncs
```

**When Called**: User logout, component unmount

---

#### `sync(token)` - THE CORE SYNCHRONIZATION ALGORITHM

**Purpose**: Performs bidirectional synchronization between client and server

**Parameters**:
- `token` (string): JWT authentication token

**Complete Process Flow**:

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: INITIALIZATION                                      │
└─────────────────────────────────────────────────────────────┘
1. Check if already syncing → exit if true
2. Check if online → exit if false
3. Set isSyncing = true
4. Notify listeners: SYNC_START

┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: PUSH LOCAL CHANGES TO SERVER                       │
└─────────────────────────────────────────────────────────────┘
1. Query IndexedDB for notes with syncStatus='pending'
2. Filter out notes in deletedNotes set
3. If pending notes exist:
   a. Call API: POST /api/notes/sync
   b. Send array of pending notes
   c. Server responds with:
      - synced: [] (successfully synced notes)
      - conflicts: [] (notes with version conflicts)

4. Handle server response:
   a. For each synced note:
      - Update in IndexedDB
      - Set syncStatus = 'synced'
      - Set lastSyncedAt = current timestamp
      - Skip if in deletedNotes set

   b. For each conflict:
      - Notify listeners: CONFLICT_DETECTED
      - Include both local and server versions
      - Application decides resolution strategy

┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: PULL SERVER CHANGES TO CLIENT                      │
└─────────────────────────────────────────────────────────────┘
1. Get all local notes from IndexedDB
2. Calculate last sync time:
   - Find maximum lastSyncedAt among all notes
   - Default to 0 if no notes exist

3. Request server changes:
   - Call API: GET /api/notes?since={lastSyncTime}
   - Server returns notes modified after timestamp

4. For each server note:
   a. Skip if note ID is in deletedNotes set

   b. Query local IndexedDB for note with same ID

   c. If NOT found locally:
      - This is a new note from server
      - Save to IndexedDB
      - Set syncStatus = 'synced'
      - Set lastSyncedAt = current timestamp

   d. If FOUND locally:
      - Compare versions

      If server.version > local.version:
        - Server has newer data

        If local.syncStatus === 'pending':
          → CONFLICT DETECTED
          → Notify listeners with both versions
          → Application must resolve

        Else:
          → Safe to update
          → Replace local with server version
          → Set syncStatus = 'synced'

      If local.version >= server.version:
        → Local is current or newer
        → Keep local version
        → Will sync to server in next cycle

┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: COMPLETION                                          │
└─────────────────────────────────────────────────────────────┘
1. Notify listeners: SYNC_SUCCESS
2. Set isSyncing = false
3. Update UI with latest data

┌─────────────────────────────────────────────────────────────┐
│ ERROR HANDLING                                               │
└─────────────────────────────────────────────────────────────┘
If any error occurs:
1. Log error to console
2. Notify listeners: SYNC_ERROR
3. Set isSyncing = false
4. Local data remains unchanged
5. Retry on next sync cycle
```

**Event Notifications**:
```javascript
SYNC_START       // Sync begins
SYNC_SUCCESS     // Sync completed successfully
SYNC_ERROR       // Sync failed
CONFLICT_DETECTED // Single note conflict
CONFLICTS_DETECTED // Multiple note conflicts
```

---

#### `markAsDeleted(noteId)`
**Purpose**: Tracks notes deleted locally to prevent recreation from server

**Parameters**:
- `noteId` (string): ID of deleted note

**Why This Exists**:
When a note is deleted locally while offline, the sync process would normally:
1. Delete from IndexedDB
2. During next sync, server returns the note (because it still exists there)
3. Sync merges it back into IndexedDB (WRONG!)

This set prevents deleted notes from being restored during sync.

**Process**:
```javascript
1. Add noteId to deletedNotes Set
2. During sync, filter out any notes in this set
3. Note stays deleted until server confirms deletion
```

---

#### `addListener(callback)`
**Purpose**: Registers event listeners for sync events

**Parameters**:
- `callback` (function): Function to call on sync events

**Event Object Structure**:
```javascript
{
  type: string,           // Event type
  error?: Error,          // If SYNC_ERROR
  conflicts?: Array,      // If CONFLICTS_DETECTED
  localNote?: Note,       // If CONFLICT_DETECTED
  serverNote?: Note       // If CONFLICT_DETECTED
}
```

**Usage in App**:
```javascript
syncManager.addListener((event) => {
  if (event.type === 'SYNC_START') {
    setSyncStatus('syncing');
  } else if (event.type === 'SYNC_SUCCESS') {
    setSyncStatus('synced');
    loadNotes(); // Refresh UI
  }
});
```

---

## 3. API Service (`frontend/src/services/api.js`)

The API service provides a clean interface for all HTTP requests to the backend.

### Configuration
```javascript
Base URL: API_URL from config.js
Authentication: Bearer token in Authorization header
Content-Type: application/json
```

### API Methods

#### `api.register(email, password, name)`
**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response**:
```json
{
  "token": "jwt.token.here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

---

#### `api.login(email, password)`
**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response**: Same as register

---

#### `api.getNotes(token, lastSyncedAt = 0)`
**Endpoint**: `GET /api/notes?since={timestamp}`

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `since` (number): Timestamp to get notes modified after

**Response**:
```json
[
  {
    "id": "note_123",
    "userId": "user_id",
    "title": "My Note",
    "content": "<p>Note content</p>",
    "createdAt": 1234567890,
    "updatedAt": 1234567890,
    "version": 1,
    "deleted": false
  }
]
```

---

#### `api.createNote(token, note)`
**Endpoint**: `POST /api/notes`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**: Complete note object

**Response**: Created note with server-generated fields

---

#### `api.updateNote(token, id, note)`
**Endpoint**: `PUT /api/notes/{id}`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**: Updated note object

**Response**: Updated note

---

#### `api.deleteNote(token, id)`
**Endpoint**: `DELETE /api/notes/{id}`

**Headers**:
```
Authorization: Bearer {token}
```

**Response**:
```json
{
  "message": "Note deleted"
}
```

**Note**: This is a soft delete. The note's `deleted` field is set to `true`.

---

#### `api.syncNotes(token, notes)` - CRITICAL SYNC ENDPOINT
**Endpoint**: `POST /api/notes/sync`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "notes": [
    {
      "id": "note_123",
      "title": "Updated Note",
      "content": "<p>New content</p>",
      "version": 2,
      "updatedAt": 1234567890,
      ...
    }
  ]
}
```

**Response**:
```json
{
  "synced": [
    // Notes successfully synced
  ],
  "conflicts": [
    {
      "clientNote": { /* local version */ },
      "serverNote": { /* server version */ }
    }
  ]
}
```

---

## 4. Backend Routes

### Authentication Routes (`server/routes/auth.js`)

#### POST `/api/auth/register`

**Controller Logic**:
```javascript
1. Extract email, password, name from request body
2. Check if user already exists
   - Query: User.findOne({ email })
   - If exists → return 400 error
3. Create new user with bcrypt hashed password
   - User.save() triggers pre-save hook
   - Password automatically hashed
4. Generate JWT token
   - Payload: { userId: user._id }
   - Secret: process.env.JWT_SECRET
   - Expiry: 30 days
5. Return token and user info
```

**Password Hashing**:
```javascript
// In User model pre-save hook
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});
```

---

#### POST `/api/auth/login`

**Controller Logic**:
```javascript
1. Extract email, password from request body
2. Find user by email
   - Query: User.findOne({ email })
   - If not found → return 401 error
3. Compare passwords
   - Use bcrypt.compare(candidatePassword, hashedPassword)
   - If no match → return 401 error
4. Generate JWT token (same as register)
5. Return token and user info
```

---

### Notes Routes (`server/routes/notes.js`)

All routes protected by `auth` middleware that validates JWT.

#### GET `/api/notes?since={timestamp}`

**Purpose**: Retrieve notes modified after a specific timestamp

**Controller Logic**:
```javascript
1. Extract userId from JWT (set by auth middleware)
2. Parse 'since' query parameter (default 0)
3. Query MongoDB:
   Note.find({
     userId: req.userId,
     updatedAt: { $gt: since },
     deleted: false
   }).sort({ updatedAt: -1 })
4. Return array of notes
```

**Use Case**: Pull sync - get server updates

---

#### POST `/api/notes`

**Purpose**: Create a new note

**Controller Logic**:
```javascript
1. Extract note data from request body
2. Add userId from authenticated request
3. Create new Note document
4. Save to MongoDB
5. Return created note
```

---

#### PUT `/api/notes/:id`

**Purpose**: Update an existing note

**Controller Logic**:
```javascript
1. Extract note ID from URL parameter
2. Find note by ID and userId:
   Note.findOne({ id: req.params.id, userId: req.userId })
3. If not found → return 404
4. Update note fields with request body
5. Save to MongoDB
6. Return updated note
```

---

#### DELETE `/api/notes/:id`

**Purpose**: Soft delete a note

**Controller Logic**:
```javascript
1. Find note by ID and userId
2. If not found → return 404
3. Set note.deleted = true
4. Update note.updatedAt = current timestamp
5. Save to MongoDB
6. Return success message
```

**Important**: This is a soft delete. The note remains in the database but marked as deleted.

---

#### POST `/api/notes/sync` - THE CRITICAL SYNC ENDPOINT

**Purpose**: Bulk synchronization with conflict detection

**Controller Logic**:

```javascript
1. Initialize result arrays:
   - synced = []
   - conflicts = []

2. For each note in request.body.notes:

   a. Query server for existing note:
      serverNote = Note.findOne({ id: clientNote.id, userId: req.userId })

   b. If serverNote does NOT exist:
      → This is a new note from client
      → Create new Note in MongoDB
      → Add to synced array

   c. If serverNote EXISTS:

      Compare versions:

      If serverNote.version > clientNote.version:
        → Server is newer
        → This is a CONFLICT
        → Add to conflicts array with both versions
        → Do not update server

      Else (clientNote.version >= serverNote.version):
        → Client is newer or same
        → Update server with client data
        → Increment version
        → Add to synced array

3. Return response:
   {
     synced: [successfully synced notes],
     conflicts: [notes requiring manual resolution]
   }
```

**Conflict Resolution Strategy**:
The server uses version numbers to detect conflicts:
- Each note has a version that increments on every update
- If server version > client version → conflict (both modified independently)
- Client receives both versions and must decide which to keep

---

## 5. Main App Component (`frontend/src/App.jsx`)

The App component orchestrates all functionality.

### State Management

```javascript
// Authentication
const [token, setToken] = useState(getToken())

// Data
const [notes, setNotes] = useState([])
const [activeNote, setActiveNote] = useState(null)
const [title, setTitle] = useState('')
const [content, setContent] = useState('')

// UI State
const [isOnline, setIsOnline] = useState(navigator.onLine)
const [lastSaved, setLastSaved] = useState(null)
const [isSaving, setIsSaving] = useState(false)
const [syncStatus, setSyncStatus] = useState('idle')
const [sidebarOpen, setSidebarOpen] = useState(true)
```

### Effect Hooks

#### Authentication & Sync Setup
```javascript
useEffect(() => {
  if (token) {
    loadNotes();
    syncManager.startAutoSync(token);

    syncManager.addListener((event) => {
      // Handle sync events
      // Update UI based on sync status
    });
  }

  return () => {
    syncManager.stopAutoSync();
  };
}, [token]);
```

#### Online/Offline Detection
```javascript
useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    if (token) {
      syncManager.sync(token); // Sync when back online
    }
  };

  const handleOffline = () => {
    setIsOnline(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, [token]);
```

#### Auto-Save Mechanism
```javascript
useEffect(() => {
  if (activeNote && (title || content)) {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    // Debounce: Save 1 second after user stops typing
    autoSaveTimeout.current = setTimeout(() => {
      handleSave();
    }, 1000);
  }

  return () => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
  };
}, [title, content]);
```

### Key Functions

#### `loadNotes()`
```javascript
async loadNotes() {
  1. Query IndexedDB: dbOperations.getAllNotes()
  2. Sort by updatedAt descending
  3. Update state: setNotes(sortedNotes)
}
```

#### `createNewNote()`
```javascript
async createNewNote() {
  1. Generate unique ID: generateId()
  2. Get current user ID: getUserId()
  3. Create note object with defaults
  4. Save to IndexedDB: dbOperations.saveNote(newNote)
  5. Reload notes list
  6. Set as active note
  7. Clear title and content inputs
}
```

#### `handleSave()`
```javascript
async handleSave() {
  1. Check if activeNote exists
  2. Set isSaving = true
  3. Find current note in state
  4. Create updated note:
     - Update title and content
     - Set updatedAt = current timestamp
     - Increment version number
     - Set syncStatus = 'pending'
  5. Save to IndexedDB
  6. Reload notes list
  7. Update lastSaved timestamp
  8. Set isSaving = false
  9. If online, trigger sync
}
```

#### `selectNote(note)`
```javascript
selectNote(note) {
  1. Set activeNote = note.id
  2. Set title = note.title
  3. Set content = note.content
  4. Rich text editor updates automatically
}
```

#### `deleteNote(id, e)`
```javascript
async deleteNote(id, e) {
  1. Stop event propagation
  2. Show confirmation dialog
  3. If confirmed:
     a. Mark as deleted in sync manager
     b. Delete from IndexedDB
     c. Clear active note if it's the deleted one
     d. Update local state immediately
     e. If online, trigger sync and API delete
}
```

---

## Operation Flows

## CREATE OPERATION - Complete Flow

```
USER CLICKS "NEW NOTE"
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: createNewNote() function            │
├───────────────────────────────────────────────┤
│ 1. Generate unique ID                         │
│    - Format: note_{timestamp}_{random}        │
│ 2. Get current user ID from JWT               │
│ 3. Create note object:                        │
│    {                                           │
│      id: "note_1234567890_abc123",            │
│      userId: "user_123",                      │
│      title: "Untitled Note",                  │
│      content: "",                             │
│      createdAt: 1234567890,                   │
│      updatedAt: 1234567890,                   │
│      lastSyncedAt: null,                      │
│      syncStatus: "pending",                   │
│      version: 1                               │
│    }                                           │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ IndexedDB: dbOperations.saveNote()            │
├───────────────────────────────────────────────┤
│ 1. Open database transaction                  │
│ 2. Put note in 'notes' object store           │
│ 3. Indexes automatically updated               │
│ 4. Transaction commits                        │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: UI Updates                           │
├───────────────────────────────────────────────┤
│ 1. loadNotes() called                         │
│ 2. Notes list refreshed                       │
│ 3. New note set as active                     │
│ 4. Editor focused and ready                   │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ User starts typing...                         │
│ - Auto-save triggers after 1 second           │
│ - Content saved to IndexedDB                  │
│ - If online, sync begins                      │
└───────────────────────────────────────────────┘
    ↓ (if online)
┌───────────────────────────────────────────────┐
│ SyncManager: sync()                            │
├───────────────────────────────────────────────┤
│ 1. Get pending notes from IndexedDB           │
│ 2. Send to server: POST /api/notes/sync       │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Backend: POST /api/notes/sync                 │
├───────────────────────────────────────────────┤
│ 1. Receive note data                          │
│ 2. Check if note exists in MongoDB            │
│ 3. Note doesn't exist → create new            │
│ 4. Save to MongoDB                            │
│ 5. Return in 'synced' array                   │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ SyncManager: Handle Response                   │
├───────────────────────────────────────────────┤
│ 1. Update note in IndexedDB:                  │
│    - syncStatus = 'synced'                    │
│    - lastSyncedAt = current time              │
│ 2. Notify listeners: SYNC_SUCCESS             │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: UI Updates                           │
├───────────────────────────────────────────────┤
│ 1. Show "Synced" indicator                    │
│ 2. Remove "Pending" badge                     │
│ 3. Note now backed up on server               │
└───────────────────────────────────────────────┘
```

---

## UPDATE OPERATION - Complete Flow

```
USER TYPES IN EDITOR
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: onChange Event                       │
├───────────────────────────────────────────────┤
│ 1. Content state updates immediately           │
│ 2. UI shows changes in real-time              │
│ 3. Auto-save timer resets                     │
└───────────────────────────────────────────────┘
    ↓ (after 1 second of inactivity)
┌───────────────────────────────────────────────┐
│ Frontend: handleSave()                         │
├───────────────────────────────────────────────┤
│ 1. Get current note from state                │
│ 2. Create updated note:                       │
│    - Update title/content                     │
│    - updatedAt = now                          │
│    - version = current + 1                    │
│    - syncStatus = 'pending'                   │
│ 3. Show "Saving..." indicator                 │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ IndexedDB: dbOperations.saveNote()            │
├───────────────────────────────────────────────┤
│ 1. Put updated note (overwrites existing)     │
│ 2. Indexes updated automatically               │
│ 3. Version number now incremented             │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: Save Complete                        │
├───────────────────────────────────────────────┤
│ 1. loadNotes() refreshes list                 │
│ 2. Show "Saved" timestamp                     │
│ 3. Hide "Saving..." indicator                 │
└───────────────────────────────────────────────┘
    ↓ (if online)
┌───────────────────────────────────────────────┐
│ SyncManager: sync()                            │
├───────────────────────────────────────────────┤
│ 1. Get pending notes                          │
│ 2. Find our updated note                      │
│ 3. Send to server                             │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Backend: POST /api/notes/sync                 │
├───────────────────────────────────────────────┤
│ 1. Find existing note in MongoDB              │
│ 2. Compare versions:                          │
│                                                │
│    CLIENT VERSION > SERVER VERSION:           │
│    → Client has newer data                    │
│    → Update MongoDB with client data          │
│    → Return in 'synced' array                 │
│                                                │
│    SERVER VERSION > CLIENT VERSION:           │
│    → Server has newer data (conflict!)        │
│    → Return in 'conflicts' array              │
│    → Client must resolve                      │
└───────────────────────────────────────────────┘
    ↓ (no conflict scenario)
┌───────────────────────────────────────────────┐
│ SyncManager: Update Local                     │
├───────────────────────────────────────────────┤
│ 1. Update IndexedDB:                          │
│    - syncStatus = 'synced'                    │
│    - lastSyncedAt = now                       │
│ 2. Note backed up successfully                │
└───────────────────────────────────────────────┘
```

### UPDATE - Conflict Scenario

```
SCENARIO: Same note edited on two devices while offline

Device A                          Device B
   ↓                                 ↓
Edit note                         Edit note
(version 1 → 2)                   (version 1 → 2)
   ↓                                 ↓
Save locally                      Save locally
   ↓                                 ↓
Device A comes online             (still offline)
   ↓
Sync to server
Server now has version 2
from Device A
   ↓
                                  Device B comes online
                                     ↓
                                  Attempts to sync
                                     ↓
                        ┌────────────────────────────┐
                        │ Server detects conflict:   │
                        │ - Server version: 2        │
                        │ - Client version: 2        │
                        │ - Different content        │
                        │ → Return in conflicts[]    │
                        └────────────────────────────┘
                                     ↓
                        ┌────────────────────────────┐
                        │ SyncManager gets conflict  │
                        │ - Notifies listener        │
                        │ - Provides both versions   │
                        │ - App shows conflict UI    │
                        └────────────────────────────┘
                                     ↓
                        ┌────────────────────────────┐
                        │ User chooses resolution:   │
                        │ - Keep server version      │
                        │ - Keep local version       │
                        │ - Merge both               │
                        └────────────────────────────┘
```

---

## DELETE OPERATION - Complete Flow

```
USER CLICKS DELETE BUTTON
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: deleteNote(id, e)                    │
├───────────────────────────────────────────────┤
│ 1. Show confirmation dialog                    │
│ 2. If user confirms → proceed                  │
│ 3. Stop event propagation                      │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ SyncManager: markAsDeleted(id)                │
├───────────────────────────────────────────────┤
│ 1. Add note ID to deletedNotes Set            │
│ 2. Prevents recreation during sync             │
│    (Important for offline scenarios)           │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ IndexedDB: dbOperations.deleteNote(id)        │
├───────────────────────────────────────────────┤
│ 1. Remove note from object store              │
│ 2. Indexes updated automatically               │
│ 3. Note permanently removed from local storage │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: Update UI                            │
├───────────────────────────────────────────────┤
│ 1. If deleted note was active → clear editor  │
│ 2. Remove from notes state immediately         │
│ 3. Update notes list (note disappears)        │
└───────────────────────────────────────────────┘
    ↓ (if online)
┌───────────────────────────────────────────────┐
│ Frontend: Sync & API Call                     │
├───────────────────────────────────────────────┤
│ 1. Trigger syncManager.sync(token)            │
│ 2. Call api.deleteNote(token, id)             │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Backend: DELETE /api/notes/:id                │
├───────────────────────────────────────────────┤
│ 1. Find note by ID and userId                 │
│ 2. Set note.deleted = true                    │
│ 3. Update note.updatedAt = now                │
│ 4. Save to MongoDB (soft delete)              │
│ 5. Return success message                     │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Result: Note Deleted                           │
├───────────────────────────────────────────────┤
│ - Removed from IndexedDB                       │
│ - Marked as deleted in MongoDB                 │
│ - Will not appear in future syncs             │
│ - Cannot be restored (hard deleted locally)   │
└───────────────────────────────────────────────┘
```

### DELETE - Offline Scenario

```
USER DELETES NOTE WHILE OFFLINE
    ↓
┌───────────────────────────────────────────────┐
│ Local Delete                                   │
├───────────────────────────────────────────────┤
│ 1. Add to deletedNotes Set                    │
│ 2. Remove from IndexedDB                      │
│ 3. UI updated immediately                     │
│ 4. Note disappears from list                  │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ User Goes Back Online                          │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Sync Process                                   │
├───────────────────────────────────────────────┤
│ 1. Server sends all notes                     │
│ 2. Includes the deleted note (server doesn't  │
│    know it's deleted yet)                     │
│ 3. SyncManager checks deletedNotes Set        │
│ 4. Skips this note - doesn't recreate it     │
│ 5. API deleteNote() call removes from server  │
└───────────────────────────────────────────────┘
```

---

## SYNC OPERATION - Detailed Flow

### Periodic Sync (Every 30 seconds)

```
TIMER TRIGGERS
    ↓
┌───────────────────────────────────────────────┐
│ SyncManager: Check Conditions                  │
├───────────────────────────────────────────────┤
│ 1. Is online? → Check navigator.onLine        │
│ 2. Already syncing? → Check isSyncing flag    │
│ 3. Has token? → Check authentication          │
│                                                │
│ If any condition fails → skip sync            │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Phase 1: Initialization                        │
├───────────────────────────────────────────────┤
│ 1. Set isSyncing = true                       │
│ 2. Notify listeners: SYNC_START               │
│ 3. UI shows sync indicator                    │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Phase 2: Push Local Changes                   │
├───────────────────────────────────────────────┤
│ 1. Query: dbOperations.getPendingNotes()      │
│    - Gets notes with syncStatus='pending'     │
│                                                │
│ 2. Filter: Remove deleted notes               │
│    - Check against deletedNotes Set           │
│                                                │
│ 3. If pending notes exist:                    │
│    - Call: api.syncNotes(token, notes)        │
│    - Server processes each note               │
│    - Returns: { synced: [], conflicts: [] }   │
│                                                │
│ 4. Update local notes:                        │
│    - For each synced note:                    │
│      • Update in IndexedDB                    │
│      • Set syncStatus='synced'                │
│      • Set lastSyncedAt=now                   │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Phase 3: Pull Server Changes                  │
├───────────────────────────────────────────────┤
│ 1. Get all local notes                        │
│ 2. Find last sync time:                       │
│    lastSync = max(allNotes.lastSyncedAt)      │
│                                                │
│ 3. Request server changes:                    │
│    GET /api/notes?since={lastSync}            │
│                                                │
│ 4. For each server note:                      │
│    a. Skip if in deletedNotes Set             │
│    b. Check if exists locally                 │
│    c. Compare versions                        │
│    d. Merge or conflict                       │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Phase 4: Completion                            │
├───────────────────────────────────────────────┤
│ 1. Set isSyncing = false                      │
│ 2. Notify listeners: SYNC_SUCCESS             │
│ 3. UI hides sync indicator                    │
│ 4. Show "Synced" confirmation                 │
└───────────────────────────────────────────────┘
```

### Manual Sync (User Clicks "Sync Now")

```
USER CLICKS "SYNC NOW" BUTTON
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: handleManualSync()                   │
├───────────────────────────────────────────────┤
│ 1. Check if online                            │
│ 2. Check if has token                         │
│ 3. Call: syncManager.sync(token)              │
└───────────────────────────────────────────────┘
    ↓
(Same process as periodic sync above)
```

### Sync on Reconnection

```
DEVICE COMES BACK ONLINE
    ↓
┌───────────────────────────────────────────────┐
│ Browser: 'online' Event Fires                  │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: handleOnline()                       │
├───────────────────────────────────────────────┤
│ 1. Update isOnline state = true               │
│ 2. Call: syncManager.sync(token)              │
│ 3. Sync all pending changes                   │
└───────────────────────────────────────────────┘
```

---

## Version Control & Conflict Resolution

### Version Number Strategy

Every note has a `version` field that increments on each update:

```javascript
Initial creation:    version = 1
First update:        version = 2
Second update:       version = 3
...and so on
```

### Conflict Detection Logic

```javascript
// In server sync endpoint
if (serverNote.version > clientNote.version) {
  // Server has newer data
  // This is a CONFLICT
  conflicts.push({
    clientNote: clientNote,
    serverNote: serverNote
  });
} else {
  // Client has newer or same data
  // Safe to update server
  Object.assign(serverNote, clientNote);
  await serverNote.save();
  synced.push(serverNote);
}
```

### Conflict Scenarios

#### Scenario 1: Normal Update (No Conflict)
```
Initial: Server v1, Client v1
Client edits → Client v2
Sync → Server accepts v2
Result: Server v2, Client v2 ✓
```

#### Scenario 2: Offline Edits (No Conflict)
```
Initial: Server v1, Client v1
Client offline, edits → Client v2
Client back online, syncs
Server still v1, accepts v2
Result: Server v2, Client v2 ✓
```

#### Scenario 3: Conflict
```
Initial: Server v1, Client A v1, Client B v1

Client A edits → v2
Client A syncs → Server v2

Client B (still offline) edits → v2
Client B syncs → CONFLICT!
  - Server has v2 from Client A
  - Client B has v2 with different content
  - Server rejects Client B's v2
  - Returns conflict to Client B

Resolution needed:
- Show both versions to user
- User chooses or merges
- Winning version becomes v3
```

---

## Authentication Flow

### Registration Flow

```
USER FILLS REGISTRATION FORM
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: Auth.jsx                             │
├───────────────────────────────────────────────┤
│ 1. Collect: email, password, name              │
│ 2. Validate: required fields                  │
│ 3. Call: api.register(email, password, name)  │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Backend: POST /api/auth/register              │
├───────────────────────────────��───────────────┤
│ 1. Check if email exists                      │
│    - Query: User.findOne({ email })           │
│    - If exists → 400 error                    │
│                                                │
│ 2. Create user:                               │
│    - new User({ email, password, name })      │
│    - Pre-save hook hashes password            │
│    - bcrypt.hash(password, 10)                │
│                                                │
│ 3. Generate JWT:                              │
│    - Payload: { userId: user._id }            │
│    - Secret: process.env.JWT_SECRET           │
│    - Expiry: 30 days                          │
│                                                │
│ 4. Return:                                    │
│    - token: "jwt.token.here"                  │
│    - user: { id, name, email }                │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: Handle Response                      │
├───────────────────────────────────────────────┤
│ 1. Store token: localStorage.setItem('token') │
│ 2. Update app state: setToken(token)          │
│ 3. Redirect to main app                       │
└───────────────────────────────────────────────┘
```

### Login Flow

```
USER FILLS LOGIN FORM
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: Auth.jsx                             │
├───────────────────────────────────────────────┤
│ 1. Collect: email, password                   │
│ 2. Call: api.login(email, password)           │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Backend: POST /api/auth/login                 │
├───────────────────────────────────────────────┤
│ 1. Find user: User.findOne({ email })         │
│    - If not found → 401 error                 │
│                                                │
│ 2. Verify password:                           │
│    - bcrypt.compare(input, hashed)            │
│    - If no match → 401 error                  │
│                                                │
│ 3. Generate JWT (same as register)            │
│                                                │
│ 4. Return token and user info                 │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: Handle Response                      │
│ (same as registration)                        │
└───────────────────────────────────────────────┘
```

### Authenticated Requests

```
ANY API REQUEST
    ↓
┌───────────────────────────────────────────────┐
│ Frontend: api.js                               │
├───────────────────────────────────────────────┤
│ Add header:                                    │
│ Authorization: Bearer {token}                  │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Backend: auth.js Middleware                    │
├───────────────────────────────────────────────┤
│ 1. Extract token from header                  │
│ 2. Verify: jwt.verify(token, secret)          │
│ 3. Decode payload → get userId                │
│ 4. Attach to request: req.userId               │
│ 5. Call next() → proceed to route handler     │
└───────────────────────────────────────────────┘
```

---

## Database Models

### User Model (`server/models/User.js`)

```javascript
{
  _id: ObjectId,           // MongoDB generated
  name: String,            // User's display name
  email: String,           // Unique, lowercase
  password: String,        // Bcrypt hashed
  createdAt: Date         // Auto-generated
}

Indexes:
- email (unique)

Methods:
- comparePassword(candidatePassword)
  Returns: Promise<boolean>

Pre-save Hook:
- Automatically hashes password if modified
```

### Note Model (`server/models/Note.js`)

```javascript
{
  _id: ObjectId,           // MongoDB generated
  id: String,              // Client-generated unique ID
  userId: ObjectId,        // Reference to User
  title: String,           // Note title
  content: String,         // Note content (HTML)
  createdAt: Number,       // Unix timestamp
  updatedAt: Number,       // Unix timestamp
  version: Number,         // Conflict resolution
  deleted: Boolean         // Soft delete flag
}

Indexes:
- { userId: 1, updatedAt: -1 } - Efficient queries by user
- { id: 1, userId: 1 } - Find specific note for user
```

---

## Setup and Installation

### Prerequisites

- Node.js 16+
- MongoDB instance (local or cloud)

### Backend Setup

```bash
cd server
npm install

# Create .env file
echo "MONGODB_URI=your_mongodb_connection_string" > .env
echo "JWT_SECRET=your_jwt_secret_key" >> .env
echo "PORT=5000" >> .env

# Start server
npm start

# For development with auto-reload
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Update API_URL in src/config.js
# export const API_URL = 'http://localhost:5000/api';

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

**Server (.env)**
```
MONGODB_URI=mongodb://localhost:27017/notes-app
JWT_SECRET=your-secret-key-here
PORT=5000
```

**Frontend (src/config.js)**
```javascript
export const API_URL = 'http://localhost:5000/api';
```

---

## Key Features

### 1. Offline-First Architecture
- All data operations work without internet
- Changes saved locally in IndexedDB
- Automatic sync when connection restored

### 2. Real-Time Auto-Save
- Debounced save (1 second after typing stops)
- No "Save" button needed
- Visual feedback during save

### 3. Rich Text Editor
- Bold, Italic, Underline formatting
- HTML content storage
- contentEditable implementation

### 4. Conflict Resolution
- Version-based conflict detection
- Both versions available for resolution
- Prevents data loss

### 5. Background Sync
- Automatic sync every 30 seconds
- Manual sync option available
- Sync on reconnection

### 6. Responsive Design
- Mobile-friendly sidebar
- Touch-optimized interactions
- Adaptive layouts

---

## Performance Considerations

### IndexedDB Performance
- Indexed queries for fast lookups
- Batch operations during sync
- Transaction-based consistency

### Network Efficiency
- Only sync changed notes (pending status)
- Incremental updates (since timestamp)
- Bulk sync endpoint reduces requests

### UI Responsiveness
- Optimistic UI updates
- Debounced auto-save
- Immediate local feedback

---

## Security

### Authentication
- JWT tokens with 30-day expiry
- Bcrypt password hashing (10 rounds)
- Token stored in localStorage

### Authorization
- All routes protected by auth middleware
- User ID extracted from JWT
- Notes filtered by userId

### Data Validation
- Email format validation
- Password minimum length
- Required field checks

---

## Future Enhancements

### Potential Features
1. **Manual Conflict Resolution UI**
   - Side-by-side comparison
   - Merge tool
   - History view

2. **Note Categories/Tags**
   - Organize notes
   - Filter by tag
   - Color coding

3. **Search Functionality**
   - Full-text search in IndexedDB
   - Filter by date range
   - Search history

4. **Sharing & Collaboration**
   - Share notes with others
   - Real-time collaboration
   - Comments and annotations

5. **Export/Import**
   - Export to Markdown, PDF
   - Import from other apps
   - Backup/restore

6. **Advanced Rich Text**
   - Lists, headings, links
   - Images, code blocks
   - Markdown support

---

## Troubleshooting

### Notes Not Syncing
1. Check network connection (online indicator)
2. Verify token is valid (check localStorage)
3. Check browser console for errors
4. Try manual sync button

### Data Loss Prevention
- All operations first save to IndexedDB
- Server errors don't affect local data
- Conflicts preserve both versions

### Performance Issues
- Clear old synced notes periodically
- Limit note content size
- Check IndexedDB storage quota

---

## Architecture Decisions

### Why IndexedDB?
- Large storage capacity (no 5MB limit like localStorage)
- Asynchronous API (non-blocking)
- Indexed queries (fast lookups)
- Transaction support (data consistency)

### Why Version Numbers?
- Simple conflict detection
- No need for complex diff algorithms
- Works offline
- Deterministic resolution

### Why Soft Delete?
- Allows sync of deletions
- Can implement undelete
- Audit trail
- Prevents accidental data loss on sync

### Why MongoDB?
- Schema flexibility
- JSON-like documents
- Easy to scale
- Good performance for read/write

---

## License

MIT License - Feel free to use this project for learning and development.

---

## Contributing

Contributions welcome! Please follow these guidelines:
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

## Contact & Support

For questions or issues, please open an issue on GitHub.

---

**Built with ❤️ using modern web technologies**
