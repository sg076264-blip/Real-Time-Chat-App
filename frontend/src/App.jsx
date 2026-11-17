import Auth from "./Auth";
import { socket } from "./socket";
import Logo from "./components/Logo";
import SettingsPage from "./components/settings/Settings";
import {
  signupUser,
  loginUser,
  getCurrentUser,
  getPreferences,
  savePreferences,
  updateProfile,
  changePassword,
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
  if (!currentUser) return;

  if (!socket.connected) {
    socket.connect();
  }

  return () => {
    socket.disconnect();
  };
}, [currentUser]);
useEffect(() => {
  function handleConnect() {
    console.log("CHATZO Socket Connected:", socket.id);
  }

  function handleConnectError(error) {
    console.error("CHATZO Socket Error:", error.message);
  }

  socket.on("connect", handleConnect);
  socket.on("connect_error", handleConnectError);

  return () => {
    socket.off("connect", handleConnect);
    socket.off("connect_error", handleConnectError);
  };
}, []);

  useEffect(() => {
    function handleRoomJoined(data) {
      console.log("CHATZO Room Joined:", data.roomId);
    }

    function handleRoomError(error) {
      console.error("CHATZO Room Error:", error.message);
    }

    socket.on("roomJoined", handleRoomJoined);
    socket.on("roomError", handleRoomError);

    return () => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("roomError", handleRoomError);
    };
  }, []);

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

        // Load user preferences after login and apply the saved theme.
        try {
          const prefsData = await getPreferences();
          const prefs = prefsData.preferences || {};
          setUserSettings((prev) => ({ ...prev, ...prefs }));
          if (prefs.theme) setTheme(prefs.theme);
        } catch {
          // Preferences may not exist yet; keep defaults.
        }
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

  async function handleSettingsChange(category, data) {
    setUserSettings((prev) => ({ ...prev, ...data }));
    if (category === "appearance") {
      setTheme(data.theme);
    }
    try {
      await savePreferences({ ...userSettings, ...data });
    } catch {
      // Save failure is non-fatal; preferences remain in local state.
    }
  }

  async function handleProfileUpdate(category, data) {
    try {
      if (category === "account") {
        const res = await updateProfile({
          name: data.displayName,
          phone: data.phone,
          avatar: data.avatar,
        });
        if (res.user) {
          setCurrentUser((prev) => (prev ? { ...prev, name: res.user.name, avatar: res.user.avatar } : prev));
        }
      } else if (category === "password") {
        await changePassword({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        });
      }
    } catch {
      // Update failure is non-fatal; local state remains.
    }
  }

  // CHATZO UI state
  const [theme, setTheme] = useState("dark");
  const [userSettings, setUserSettings] = useState({
    theme: "dark",
    accentColor: "cyan",
    customAccent: "#08B9DF",
    bubbleStyle: "rounded",
    chatBg: "#020D28",
    sidebar: "dark",
    fontSize: "md",
    chatPrefs: {
      enterToSend: true,
      showTimestamps: true,
      messagePreview: true,
    },
    notifications: {
      messages: true,
      sound: true,
      rooms: true,
      previews: true,
    },
    privacy: {
      onlineStatus: true,
      lastSeen: true,
      profileVisibility: "everyone",
    },
  });

  const [enteringMessageId, setEnteringMessageId] = useState(null);

  const ACCENT_COLOR_MAP = {
    cyan: "#08B9DF",
    blue: "#2563EB",
    purple: "#7E2FCE",
    green: "#16A34A",
    pink: "#DB2777",
    orange: "#EA580C",
  };

  const FONT_SIZE_MAP = {
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
  };

  // Theme engine: sync saved preferences to CSS custom properties so they
  // apply immediately across the entire UI.
  useEffect(() => {
    const accent =
      userSettings.accentColor === "custom"
        ? userSettings.customAccent
        : ACCENT_COLOR_MAP[userSettings.accentColor] || "#08B9DF";

    // Default chat background based on theme mode
    const defaultChatBg =
      userSettings.theme === "light" ? "#f3f7fc" : "#020D28";

    document.documentElement.style.setProperty("--chatzo-accent", accent);
    document.documentElement.style.setProperty("--chatzo-cyan", "#08B9DF");
    document.documentElement.style.setProperty(
      "--chatzo-chat-bg",
      userSettings.chatBg === "#020D28" ? defaultChatBg : userSettings.chatBg
    );
    document.documentElement.style.setProperty(
      "--chatzo-font-size",
      FONT_SIZE_MAP[userSettings.fontSize] || "1rem"
    );
  }, [userSettings]);

  // Clear entering message ID after animation completes so it only runs once
  useEffect(() => {
    if (!enteringMessageId) return;
    const timer = setTimeout(() => setEnteringMessageId(null), 500);
    return () => clearTimeout(timer);
  }, [enteringMessageId]);

  // System Default theme: follow the operating system preference.
  useEffect(() => {
    if (userSettings.theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setTheme(e.matches ? "dark" : "light");
    };

    // Initialize based on current OS preference
    setTheme(media.matches ? "dark" : "light");

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [userSettings.theme]);
  const [activeNav, setActiveNav] = useState("Messages");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(startingMessages);
  const [showDetails, setShowDetails] = useState(true);

  // Day 9: live room data
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);

  // Join the selected room, including when the socket connects after room loading.
  useEffect(() => {
    if (!selectedRoom?._id) return;

    const joinSelectedRoom = () => {
      socket.emit("joinRoom", selectedRoom._id);
    };

    if (socket.connected) {
      joinSelectedRoom();
    }

    socket.on("connect", joinSelectedRoom);

    return () => {
      socket.off("connect", joinSelectedRoom);
    };
  }, [selectedRoom]);

  // Receive messages from the currently selected room in real time.
  useEffect(() => {
    function handleNewMessage(message) {
      const messageRoomId =
        typeof message.room === "string" ? message.room : message.room?._id;

      if (!selectedRoom?._id || String(messageRoomId) !== String(selectedRoom._id)) {
        return;
      }

      const senderId = message.sender?._id || message.sender;
      const currentUserId = currentUser?.id || currentUser?._id;

      const formattedMessage = {
        id: message._id,
        mine: String(senderId) === String(currentUserId),
        text: message.text,
        author: message.sender?.name || "Unknown",
        time: message.createdAt
          ? new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Now",
      };

      setMessages((prev) => [...prev, formattedMessage]);
      setEnteringMessageId(message._id);
    }

    function handleMessageError(error) {
      setRoomError(error?.message || "Unable to send message.");
    }

    socket.on("newMessage", handleNewMessage);
    socket.on("messageError", handleMessageError);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageError", handleMessageError);
    };
  }, [currentUser, selectedRoom]);

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
    setMessages([]);
    setEnteringMessageId(null);

    try {
      const [roomData, memberData] = await Promise.all([
        getRoomById(roomId),
        getRoomMembers(roomId),
      ]);
      setSelectedRoom(roomData.room);
      setRoomMembers(memberData.members || []);
      setMessages([]);
      setEnteringMessageId(null);
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

    const messageText = draft.trim();

    if (!messageText || !selectedRoom || !isMember) return;

    if (!socket.connected) {
      setRoomError("Not connected to the chat server. Please try again.");
      return;
    }

    setRoomError("");
    socket.emit("sendMessage", {
      roomId: selectedRoom._id,
      text: messageText,
    });
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
          <Logo size={30} />
        </div>
        <div className="rail-separator" />
        <button className={`rail-btn ${activeNav === "Home" ? "active" : ""}`} title="Home" onClick={() => setActiveNav("Home")}><Home /></button>
        <button className={`rail-btn ${activeNav === "Messages" ? "active" : ""}`} title="Messages" onClick={() => setActiveNav("Messages")}><MessageCircle /></button>
        <button className={`rail-btn ${activeNav === "Contacts" ? "active" : ""}`} title="Contacts" onClick={() => setActiveNav("Contacts")}><Users /></button>
        <div className="rail-spacer" />
        <button className={`rail-btn ${activeNav === "Settings" ? "active" : ""}`} title="Settings" onClick={() => setActiveNav("Settings")}><Settings /></button>
        <button className="rail-profile" title="Profile" onClick={() => setActiveNav("Profile")}>
          <Avatar initials={getInitials(currentUser.name || "User")} color="cyan" />
        </button>
      </aside>

      {activeNav === "Settings" ? (
        <SettingsPage currentUser={currentUser} onUpdate={handleProfileUpdate} onSettingsChange={handleSettingsChange} onLogout={handleLogout} />
      ) : activeNav === "Home" ? (
        <div className="home-page">
          <div className="home-header">
            <div className="home-greeting">
              <h1>Welcome back, {currentUser?.name || "User"}!</h1>
              <p>Here's what's happening in CHATZO today.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setActiveNav("Messages")}>
              Go to Messages <Send size={16} />
            </button>
          </div>
          <div className="home-stats">
            <div className="stat-card">
              <span className="stat-label">Total Rooms</span>
              <span className="stat-value">{rooms.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Your Rooms</span>
              <span className="stat-value">{selectedRoom ? "1 selected" : "None"}</span>
            </div>
          </div>
          <div className="home-actions">
            <h3>Quick Actions</h3>
            <div className="action-grid">
              <button className="action-btn" onClick={() => { setRoomError(""); setShowCreateRoom(true); }}>
                <Plus size={18} /> Create Room
              </button>
              <button className="action-btn" onClick={() => setActiveNav("Messages")}>
                <MessageCircle size={18} /> Browse Rooms
              </button>
              <button className="action-btn coming-soon" disabled>
                <Users size={18} /> Contacts
              </button>
              <button className="action-btn" onClick={() => setActiveNav("Settings")}>
                <Settings size={18} /> App Settings
              </button>
            </div>
          </div>
        </div>
      ) : activeNav === "Contacts" ? (
        <div className="coming-soon-page">
          <div className="coming-soon-card">
            <Users size={48} />
            <h2>Contacts</h2>
            <p>Contact management is coming soon.</p>
            <button className="btn btn-primary" onClick={() => setActiveNav("Messages")}>
              Go back to Messages <Send size={16} />
            </button>
          </div>
        </div>
      ) : activeNav === "Profile" ? (
        <div className="profile-page">
          <div className="profile-card">
            <div className="profile-avatar">
              <Avatar initials={getInitials(currentUser.name || "User")} color="cyan" large />
            </div>
            <h2>{currentUser.name}</h2>
            <p className="profile-email">{currentUser.email}</p>
            <p className="profile-id">Account ID: {currentUser.id}</p>
            <div className="profile-actions">
              <button className="btn btn-primary" onClick={() => setActiveNav("Settings")} style={{ width: "100%" }}>
                Edit Profile in Settings
              </button>
              <button className="btn btn-outline" onClick={() => setActiveNav("Messages")} style={{ width: "100%", marginTop: 8 }}>
                Back to Messages
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "contents" }}>
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
                {userSettings.chatPrefs.messagePreview && (
                  <div className="chat-preview">{room.description || "No description"}</div>
                )}
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
            {roomError && (
  <div className="room-error">
    {roomError}
  </div>
)}
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
            {roomError && (
  <div className="room-error">
    {roomError}
  </div>
)}
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
            <button className="icon-btn theme-toggle" title="Toggle theme" onClick={() => {
              const next = theme === "dark" ? "light" : "dark";
              setTheme(next);
              setUserSettings((prev) => ({ ...prev, theme: next }));
            }}>
              {theme === "dark" ? <Sun /> : <Moon />}
            </button>
          </div>
        </header>

        {roomError && <div className="room-error" role="alert">{roomError}</div>}

        {detailLoading ? (
          <section className={`messages-area bubble-style-${userSettings.bubbleStyle} chat-bg-custom`}><div className="empty-search">Loading room details...</div></section>
        ) : selectedRoom ? (
          <section className={`messages-area bubble-style-${userSettings.bubbleStyle} chat-bg-custom`}>
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
              <div
                key={msg.id}
                className={`message-row ${msg.mine ? "mine" : ""}${
                  msg.id === enteringMessageId ? " message-entering" : ""
                }`}
              >
                <div className="message-content">
                  {!msg.mine && <span className="message-author">{msg.author}</span>}
                  <div className="bubble">{msg.text}</div>
                  <div className="message-meta">{userSettings.chatPrefs.showTimestamps && <span>{msg.time}</span>}{msg.mine && <CheckCheck size={14} className="read-check" />}</div>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className={`messages-area bubble-style-${userSettings.bubbleStyle} chat-bg-custom`}>
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
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !userSettings.chatPrefs.enterToSend) {
                  e.preventDefault();
                }
              }}
              placeholder={
                !selectedRoom
                  ? "Select a room first"
                  : !isMember
                    ? "Join this room to send messages"
                    : `Message ${selectedRoom.name}...`
              }
              disabled={!selectedRoom || !isMember}
            />
            <button type="button" className="composer-tool emoji" title="Emoji" disabled><Smile /></button>
            <button type="submit" className="send-btn" disabled={!draft.trim() || !selectedRoom || !isMember || !socket.connected}><Send size={17} /></button>
          </div>
          <div className="composer-hint">
            <span>
              {!socket.connected
                ? "Connecting to chat server..."
                : isMember
                  ? "Connected · Real-time messaging enabled"
                  : "Join this room to participate in the conversation."}
            </span>
          </div>
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
      )}
    </div>
  );
}
