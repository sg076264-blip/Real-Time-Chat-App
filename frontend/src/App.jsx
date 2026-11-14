import Auth from "./Auth";
import {
  signupUser,
  loginUser,
  getCurrentUser,
  getRooms,
  searchRooms,
  getRoomById,
  getRoomMembers,
  joinRoom,
  leaveRoom,
  createRoom,
  updateRoom,
  deleteRoom,
} from "./api";
import React, { useEffect, useMemo, useState } from "react";
import {
  Search, MessageCircle, Users, Settings, Home, Plus, MoreHorizontal,
  Paperclip, Smile, Send, Phone, Video, Info, Sun, Moon, CheckCheck,
  Image
} from "lucide-react";

const startingMessages = [
  { id: 1, mine: false, text: "Room is ready for your conversations.", time: "Now", author: "CHATZO" },
];

function getInitials(name = "Room") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ initials, color = "blue", online = false, large = false }) {
  return (
    <div className={`avatar ${color} ${large ? "large" : ""}`}>
      {initials}
      <i className={online ? "online" : ""} />
    </div>
  );
}

export default function App() {
  // Authentication
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem("chatzoToken");
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const data = await getCurrentUser(token);
        setCurrentUser(data.user);
      } catch {
        localStorage.removeItem("chatzoToken");
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    verifySession();
  }, []);

  async function handleSignup(userData) {
    return signupUser(userData);
  }

  async function handleLogin(userData) {
    const data = await loginUser(userData);
    if (!data.token) throw new Error("Login token was not received.");
    localStorage.setItem("chatzoToken", data.token);
    setCurrentUser(data.user);
  }

  function handleLogout() {
    localStorage.removeItem("chatzoToken");
    setCurrentUser(null);
    setRooms([]);
    setSelectedRoom(null);
    setRoomMembers([]);
  }

  // CHATZO UI state
  const [theme, setTheme] = useState("dark");
  const [activeNav, setActiveNav] = useState("Messages");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(startingMessages);
  const [showDetails, setShowDetails] = useState(true);

  // Day 9: live room data
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [roomError, setRoomError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [editRoomName, setEditRoomName] = useState("");
  const [editRoomDescription, setEditRoomDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadRooms(searchTerm = "") {
    setRoomsLoading(true);
    setRoomError("");

    try {
      const data = searchTerm.trim()
        ? await searchRooms(searchTerm.trim())
        : await getRooms(1, 20);

      const nextRooms = data.rooms || [];
      setRooms(nextRooms);

      if (selectedRoom) {
        const stillExists = nextRooms.some((room) => room._id === selectedRoom._id);
        if (!stillExists) {
          setSelectedRoom(null);
          setRoomMembers([]);
        }
      } else if (nextRooms.length > 0) {
        await selectRoom(nextRooms[0]._id);
      }
    } catch (error) {
      setRoomError(error.message || "Unable to load rooms.");
    } finally {
      setRoomsLoading(false);
    }
  }

  async function selectRoom(roomId) {
    setDetailLoading(true);
    setRoomError("");

    try {
      const [roomData, memberData] = await Promise.all([
        getRoomById(roomId),
        getRoomMembers(roomId),
      ]);
      setSelectedRoom(roomData.room);
      setRoomMembers(memberData.members || []);
      setMessages(startingMessages);
    } catch (error) {
      setRoomError(error.message || "Unable to load room details.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser) loadRooms("");
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const searchTerm = query.trim();
    const handle = setTimeout(() => loadRooms(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [query, currentUser]);

  const isMember = useMemo(() => {
    if (!selectedRoom || !currentUser) return false;
    const userId = currentUser.id || currentUser._id;
    return (selectedRoom.members || []).some((member) => {
      const memberId = typeof member === "string" ? member : member?._id;
      return memberId === userId;
    });
  }, [selectedRoom, currentUser]);

  const isCreator = useMemo(() => {
    if (!selectedRoom || !currentUser) return false;
    const creatorId =
      typeof selectedRoom.createdBy === "string"
        ? selectedRoom.createdBy
        : selectedRoom.createdBy?._id;
    return creatorId === (currentUser.id || currentUser._id);
  }, [selectedRoom, currentUser]);

  async function handleMembershipAction() {
    if (!selectedRoom) return;
    setActionLoading(true);
    setRoomError("");

    try {
      if (isMember) {
        await leaveRoom(selectedRoom._id);
      } else {
        await joinRoom(selectedRoom._id);
      }

      await selectRoom(selectedRoom._id);
      await loadRooms(query);
    } catch (error) {
      setRoomError(error.message || "Room membership could not be updated.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    const name = newRoomName.trim();
    const description = newRoomDescription.trim();

    if (!name) {
      setRoomError("Please enter a room name.");
      return;
    }

    setCreateLoading(true);
    setRoomError("");
    try {
      const data = await createRoom({ name, description });
      const createdRoom = data.room;
      setShowCreateRoom(false);
      setNewRoomName("");
      setNewRoomDescription("");
      await loadRooms("");
      if (createdRoom?._id) await selectRoom(createdRoom._id);
      setQuery("");
    } catch (error) {
      setRoomError(error.message || "Unable to create room.");
    } finally {
      setCreateLoading(false);
    }
  }

  function openEditRoom() {
    if (!selectedRoom || !isCreator) return;
    setEditRoomName(selectedRoom.name || "");
    setEditRoomDescription(selectedRoom.description || "");
    setRoomError("");
    setShowEditRoom(true);
  }

  async function handleUpdateRoom(e) {
    e.preventDefault();
    if (!selectedRoom || !isCreator) return;
    const name = editRoomName.trim();
    const description = editRoomDescription.trim();
    if (!name) {
      setRoomError("Please enter a room name.");
      return;
    }

    setEditLoading(true);
    setRoomError("");
    try {
      await updateRoom(selectedRoom._id, { name, description });
      setShowEditRoom(false);
      await loadRooms(query);
      await selectRoom(selectedRoom._id);
    } catch (error) {
      setRoomError(error.message || "Unable to update room.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteRoom() {
    if (!selectedRoom || !isCreator || deleteLoading) return;
    const confirmed = window.confirm(
      `Delete "${selectedRoom.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeleteLoading(true);
    setRoomError("");
    const deletedRoomId = selectedRoom._id;
    try {
      await deleteRoom(deletedRoomId);
      setSelectedRoom(null);
      setRoomMembers([]);
      setMessages(startingMessages);
      await loadRooms(query);
    } catch (error) {
      setRoomError(error.message || "Unable to delete room.");
    } finally {
      setDeleteLoading(false);
    }
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), mine: true, text: draft.trim(), time: "Now" },
    ]);
    setDraft("");
  }

  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>CHATZO</h2>
          <p>Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLogin={handleLogin} onSignup={handleSignup} />;
  }

  const selectedName = selectedRoom?.name || "Select a room";
  const selectedInitials = getInitials(selectedName);
  const creatorName =
    selectedRoom?.createdBy?.name || "Unknown creator";

  return (
    <div className={`app ${theme}`}>
      <aside className="rail">
        <div className="brand-mark">
          <MessageCircle size={22} strokeWidth={2.6} />
          <span className="brand-dot">•••</span>
        </div>
        <div className="rail-separator" />
        <button className={`rail-btn ${activeNav === "Home" ? "active" : ""}`} title="Home" onClick={() => setActiveNav("Home")}><Home /></button>
        <button className={`rail-btn ${activeNav === "Messages" ? "active" : ""}`} title="Messages" onClick={() => setActiveNav("Messages")}><MessageCircle /></button>
        <button className={`rail-btn ${activeNav === "Contacts" ? "active" : ""}`} title="Contacts" onClick={() => setActiveNav("Contacts")}><Users /></button>
        <div className="rail-spacer" />
        <button className={`rail-btn ${activeNav === "Settings" ? "active" : ""}`} title="Settings" onClick={() => setActiveNav("Settings")}><Settings /></button>
        <button className="rail-profile" title="Click to logout" onClick={handleLogout}>
          <Avatar initials={getInitials(currentUser.name || "User")} color="cyan" />
        </button>
      </aside>

      <aside className="chat-sidebar">
        <div className="sidebar-top">
          <div>
            <div className="eyebrow">YOUR SPACE</div>
            <h1>Rooms <span className="count-pill">{rooms.length}</span></h1>
          </div>
          <button className="icon-btn new-chat create-room-trigger" title="Create a room" onClick={() => { setRoomError(""); setShowCreateRoom(true); }}>
            <Plus size={20} />
          </button>
        </div>

        <div className="search-box">
          <Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rooms..." />
          <kbd>⌘ K</kbd>
        </div>

        <div className="filter-row">
          <button className="filter active">All <span>{rooms.length}</span></button>
          <button className="filter" onClick={() => setQuery("")}>Clear search</button>
        </div>

        <div className="section-label">AVAILABLE ROOMS <MoreHorizontal size={17} /></div>
        <div className="chat-list">
          {roomsLoading && <div className="empty-search">Loading rooms...</div>}
          {!roomsLoading && rooms.map((room, index) => (
            <button
              key={room._id}
              onClick={() => selectRoom(room._id)}
              className={`chat-item ${selectedRoom?._id === room._id ? "selected" : ""}`}
            >
              <Avatar initials={getInitials(room.name)} color={["violet", "blue", "orange", "pink", "cyan"][index % 5]} />
              <div className="chat-copy">
                <div className="chat-name-row">
                  <strong>{room.name}</strong>
                  <span>{room.members?.length ?? ""}</span>
                </div>
                <div className="chat-preview">{room.description || "No description"}</div>
              </div>
            </button>
          ))}
          {!roomsLoading && rooms.length === 0 && (
            <div className="empty-search">No rooms found. Try another search.</div>
          )}
        </div>
        <div className="sidebar-footer">
          <div className="sync-indicator" />
          <span>Connected to room APIs</span>
          <span className="footer-version">CHATZO 1.0</span>
        </div>
      </aside>

      {showCreateRoom && (
        <div className="room-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateRoom(false); }}>
          <form className="room-modal" onSubmit={handleCreateRoom}>
            <div className="room-modal-heading">
              <div>
                <span className="eyebrow">NEW CONVERSATION SPACE</span>
                <h2>Create a room</h2>
                <p>Give your room a name and an optional description.</p>
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setShowCreateRoom(false)}>×</button>
            </div>
            <label className="room-field">
              Room name
              <input autoFocus maxLength={50} value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="e.g. Project Team" required />
            </label>
            <label className="room-field">
              Description <span>(optional)</span>
              <textarea maxLength={250} rows={3} value={newRoomDescription} onChange={(e) => setNewRoomDescription(e.target.value)} placeholder="What is this room about?" />
            </label>
            <div className="room-modal-actions">
              <button type="button" className="room-cancel-btn" onClick={() => setShowCreateRoom(false)}>Cancel</button>
              <button type="submit" className="room-create-btn" disabled={createLoading || !newRoomName.trim()}>
                {createLoading ? "Creating..." : "Create room"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditRoom && selectedRoom && (
        <div className="room-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !editLoading) setShowEditRoom(false); }}>
          <form className="room-modal" onSubmit={handleUpdateRoom}>
            <div className="room-modal-heading">
              <div>
                <span className="eyebrow">ROOM SETTINGS</span>
                <h2>Edit room</h2>
                <p>Update this room's name and description.</p>
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setShowEditRoom(false)} disabled={editLoading}>×</button>
            </div>
            <label className="room-field">
              Room name
              <input autoFocus maxLength={50} value={editRoomName} onChange={(e) => setEditRoomName(e.target.value)} placeholder="Room name" required />
            </label>
            <label className="room-field">
              Description <span>(optional)</span>
              <textarea maxLength={250} rows={3} value={editRoomDescription} onChange={(e) => setEditRoomDescription(e.target.value)} placeholder="What is this room about?" />
            </label>
            <div className="room-modal-actions">
              <button type="button" className="room-cancel-btn" onClick={() => setShowEditRoom(false)} disabled={editLoading}>Cancel</button>
              <button type="submit" className="room-create-btn" disabled={editLoading || !editRoomName.trim()}>
                {editLoading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      <main className="conversation">
        <header className="conversation-header">
          <div className="contact-heading">
            <Avatar initials={selectedInitials} color="cyan" large />
            <div>
              <h2>{selectedName}</h2>
              <p>
                {selectedRoom ? `${roomMembers.length} members · Created by ${creatorName}` : "Choose a room to view details"}
              </p>
            </div>
          </div>
          <div className="header-actions">
            {selectedRoom && (
              <button className="icon-btn" title="Room members" onClick={() => setShowDetails(!showDetails)}><Info /></button>
            )}
            <button className="icon-btn theme-toggle" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun /> : <Moon />}
            </button>
          </div>
        </header>

        {roomError && <div className="empty-search" role="alert">{roomError}</div>}

        {detailLoading ? (
          <section className="messages-area"><div className="empty-search">Loading room details...</div></section>
        ) : selectedRoom ? (
          <section className="messages-area">
            <div className="message-intro">
              <div className="intro-icon"><Users size={20} /></div>
              <strong>{selectedRoom.name}</strong>
              <p>{selectedRoom.description || "This room has no description yet."}</p>
              <p>Created by {creatorName}</p>
              <p>{roomMembers.length} room member(s)</p>
              <button className="membership-btn" onClick={handleMembershipAction} disabled={actionLoading || isCreator}>
                {actionLoading ? "Please wait..." : isCreator ? "Room creator" : isMember ? "Leave room" : "Join room"}
              </button>
              {isCreator && (
                <div className="room-owner-actions">
                  <button type="button" className="room-edit-btn" onClick={openEditRoom}>Edit room</button>
                  <button type="button" className="room-delete-btn" onClick={handleDeleteRoom} disabled={deleteLoading}>
                    {deleteLoading ? "Deleting..." : "Delete room"}
                  </button>
                </div>
              )}
            </div>
            <div className="date-divider"><span /><p>ROOM PREVIEW</p><span /></div>
            {messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.mine ? "mine" : ""}`}>
                <div className="message-content">
                  {!msg.mine && <span className="message-author">{msg.author}</span>}
                  <div className="bubble">{msg.text}</div>
                  <div className="message-meta"><span>{msg.time}</span>{msg.mine && <CheckCheck size={14} className="read-check" />}</div>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="messages-area">
            <div className="message-intro">
              <div className="intro-icon"><MessageCircle size={20} /></div>
              <strong>No room selected</strong>
              <p>Select a room from the list to see its details.</p>
            </div>
          </section>
        )}

        <form className="composer-wrap" onSubmit={sendMessage}>
          <div className="composer">
            <button type="button" className="composer-tool" title="Attach file" disabled><Paperclip /></button>
            <button type="button" className="composer-tool" title="Add image" disabled><Image /></button>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={selectedRoom ? `Message ${selectedRoom.name}... (preview only)` : "Select a room first"} disabled={!selectedRoom} />
            <button type="button" className="composer-tool emoji" title="Emoji" disabled><Smile /></button>
            <button type="submit" className="send-btn" disabled={!draft.trim() || !selectedRoom}><Send size={17} /></button>
          </div>
          <div className="composer-hint"><span>Messages are local preview only until Socket.IO integration.</span></div>
        </form>
      </main>

      {showDetails && selectedRoom && (
        <aside className="details-panel">
          <div className="details-head">
            <strong>Room details</strong>
            <button className="icon-btn" onClick={() => setShowDetails(false)}>×</button>
          </div>
          <div className="details-person">
            <Avatar initials={selectedInitials} color="cyan" large />
            <h3>{selectedRoom.name}</h3>
            <p>Chat room</p>
          </div>
          <div className="details-block">
            <span>ABOUT</span>
            <p>{selectedRoom.description || "No description provided."}</p>
            <p>Created by: {creatorName}</p>
          </div>
          <div className="details-block">
            <span>MEMBERS ({roomMembers.length})</span>
            {roomMembers.map((member) => (
              <div className="chat-item" key={member._id}>
                <Avatar initials={getInitials(member.name)} color="blue" />
                <div className="chat-copy">
                  <div className="chat-name-row"><strong>{member.name}</strong></div>
                  <div className="chat-preview">{member.email}</div>
                </div>
              </div>
            ))}
            {roomMembers.length === 0 && <p>No members found.</p>}
          </div>
        </aside>
      )}
    </div>
  );
}
