import React, { useState, useEffect, useRef } from "react";
import {
  Save,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  Clock,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { dbOperations } from "./services/indexDB";
import { syncManager } from "./services/syncManager";
import {
  generateId,
  formatDate,
  getToken,
  getUserId,
  removeToken,
} from "./utils/helpers";
import Auth from "./components/Auth";
import { api } from "./services/api";

function App() {
  const [token, setToken] = useState(getToken());
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const autoSaveTimeout = useRef(null);
  const editorRef = useRef(null);

  // Set HTML only when content changes externally (switch note)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content, activeNote]);

  const runCmd = (cmd, val = null) => {
    editorRef.current.focus(); // 👈 This fixes everything
    document.execCommand(cmd, false, val);
  };

  useEffect(() => {
    if (token) {
      loadNotes();
      syncManager.startAutoSync(token);

      syncManager.addListener((event) => {
        if (event.type === "SYNC_START") {
          setSyncStatus("syncing");
        } else if (event.type === "SYNC_SUCCESS") {
          setSyncStatus("synced");
          loadNotes();
          setTimeout(() => setSyncStatus("idle"), 2000);
        } else if (event.type === "SYNC_ERROR") {
          setSyncStatus("error");
        }
      });
    }

    return () => {
      syncManager.stopAutoSync();
    };
  }, [token]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (token) {
        syncManager.sync(token);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [token]);

  useEffect(() => {
    if (activeNote && (title || content)) {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }

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

  const loadNotes = async () => {
    try {
      const loadedNotes = await dbOperations.getAllNotes();
      setNotes(loadedNotes.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  };

  const createNewNote = async () => {
    const newNote = {
      id: generateId(),
      userId: getUserId(),
      title: "Untitled Note",
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSyncedAt: null,
      syncStatus: "pending",
      version: 1,
    };

    try {
      await dbOperations.saveNote(newNote);
      await loadNotes();
      setActiveNote(newNote.id);
      setTitle(newNote.title);
      setContent(newNote.content);
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleSave = async () => {
    if (!activeNote) return;

    setIsSaving(true);
    const currentNote = notes.find((n) => n.id === activeNote);

    const updatedNote = {
      ...currentNote,
      title: title || "Untitled Note",
      content: content,
      updatedAt: Date.now(),
      syncStatus: "pending",
      version: (currentNote?.version || 0) + 1,
    };

    try {
      await dbOperations.saveNote(updatedNote);
      await loadNotes();
      setLastSaved(new Date());
      setTimeout(() => setIsSaving(false), 500);

      if (isOnline && token) {
        syncManager.sync(token);
      }
    } catch (error) {
      console.error("Error saving note:", error);
      setIsSaving(false);
    }
  };

  const selectNote = (note) => {
    setActiveNote(note.id);
    setTitle(note.title);
    setContent(note.content);
  };

  const deleteNote = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Delete this note permanently?")) {
      try {
        syncManager.markAsDeleted(id);
        // Delete from IndexedDB
        await dbOperations.deleteNote(id);

        // Clear active note if it's the one being deleted
        if (activeNote === id) {
          setActiveNote(null);
          setTitle("");
          setContent("");
        }

        // Update local state immediately
        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));

        // If online, sync the deletion to server
        if (isOnline && token) {
          try {
            await syncManager.sync(token);
            await api.deleteNote(token, id);
          } catch (syncError) {
            console.error("Sync error after delete:", syncError);
          }
        }
      } catch (error) {
        console.error("Error deleting note:", error);
        // Reload notes to ensure consistency
        await loadNotes();
      }
    }
  };

  const handleLogout = () => {
    removeToken();
    setToken(null);
    syncManager.stopAutoSync();
  };

  const handleManualSync = () => {
    if (token && isOnline) {
      syncManager.sync(token);
    }
  };

  if (!token) {
    return <Auth onLogin={setToken} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div
        className="w-80 bg-white border-r border-gray-200 flex flex-col
  max-sm:absolute max-sm:z-50 max-sm:w-64 max-sm:h-screen max-sm:-translate-x-full 
  max-sm:transition-transform max-sm:duration-300"
        style={{
          transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">My Notes</h1>
            <div className="flex items-center gap-2">
              {syncStatus === "syncing" && (
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
              )}
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="sm:hidden font-bold"
              >
                {sidebarOpen ? "☰" : "✕"}
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <button
            onClick={createNewNote}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Note
          </button>
          {isOnline && (
            <button
              onClick={handleManualSync}
              className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 px-4 flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Now
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-2">No notes yet</p>
              <p className="text-sm">Create your first note to get started</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                  activeNote === note.id
                    ? "bg-blue-50 border-l-4 border-l-blue-500"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate mb-1">
                      {note.title}
                    </h3>
                    {/* <p className="text-sm text-gray-600 truncate mb-2">
                      {note.content || "No content"}
                    </p> */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(note.updatedAt)}
                      {note.syncStatus === "pending" && (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteNote(note.id, e)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="sm:hidden absolute top-4 left-4 p-2 bg-white shadow-md rounded-lg"
        >
          {sidebarOpen ? "☰" : "✕"}
        </button>

        {activeNote ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-2xl font-bold text-gray-800 border-none outline-none bg-transparent flex-1"
                  placeholder="Note title..."
                />
              </div>
              <div className="flex items-center gap-3">
                {isSaving && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Save className="w-4 h-4 animate-pulse" />
                    Saving...
                  </span>
                )}
                {lastSaved && !isSaving && (
                  <span className="text-sm text-gray-500">
                    Saved {formatDate(lastSaved.getTime())}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 relative p-8 overflow-y-auto no-scrollbar bg-white">
              {/* Rich Text Editor */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning={true}
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                className="w-full min-h-full text-gray-700 text-lg leading-relaxed outline-none border-none focus:outline-none
    max-sm:text-base"
                style={{ lineHeight: "1.8", paddingBottom: "90px" }}
              />
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-sm:w-[95%]">
                <div
                  className="flex items-center justify-center gap-4 px-4 py-2
    bg-white/90 backdrop-blur-xl border border-gray-200 shadow-xl
    rounded-2xl w-fit max-sm:w-full max-sm:justify-between"
                >
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runCmd("bold")}
                    className="px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    B
                  </button>

                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runCmd("italic")}
                    className="px-3 py-1.5 rounded-lg italic hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    I
                  </button>

                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runCmd("underline")}
                    className="px-3 py-1.5 rounded-lg underline hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    U
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-xl mb-2">Select a note or create a new one</p>
              <p className="text-sm">
                Your notes work offline and sync when you're back online
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
