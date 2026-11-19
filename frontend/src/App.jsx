

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
  searchUsers,
  getConversations,
  createConversation,
} from "./api";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MessageCircle,
  Users,
  Settings,
  Home,
  Plus,
  MoreHorizontal,
  Paperclip,
  Smile,
  Send,
  Info,
  Sun,
  Moon,
  CheckCheck,
  Image,
} from "lucide-react";

function formatSocketMessage(message, currentUser) {
  const senderId = message?.sender?._id || message?.sender;
  const currentUserId = currentUser?.id || currentUser?._id;
  const createdAt = message?.createdAt || new Date().toISOString();

  return {
    id: String(message?._id || message?.id),
    mine: String(senderId) === String(currentUserId),
    text: message?.text || "",
    author: message?.sender?.name || "Unknown",
    time: new Date(createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    createdAt,
  };
}

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

  const [activeNav, setActiveNav] = useState("Messages");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [showDetails, setShowDetails] = useState(true);

  // Group chat state
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);

  // Private chat state
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [activeChatType, setActiveChatType] = useState("room");

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [privateChatLoading, setPrivateChatLoading] = useState(false);

  // Socket state
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingUserIds, setTypingUserIds] = useState([]);
  const typingTimeoutRef = useRef(null);

  // Room UI state
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

  // Socket connection
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
      setSocketConnected(true);
      console.log("CHATZO Socket Connected:", socket.id);
    }

    function handleDisconnect() {
      setSocketConnected(false);
    }

    function handleConnectError(error) {
      setSocketConnected(false);
      console.error("CHATZO Socket Error:", error.message);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    setSocketConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, []);

  // Online users
  useEffect(() => {
    function handleOnlineSnapshot(userIds = []) {
      setOnlineUserIds(userIds.map((id) => String(id)));
    }

    function handleUserOnline({ userId } = {}) {
      if (!userId) return;

      setOnlineUserIds((prev) =>
        prev.includes(String(userId)) ? prev : [...prev, String(userId)]
      );
    }

    function handleUserOffline({ userId } = {}) {
      if (!userId) return;

      setOnlineUserIds((prev) =>
        prev.filter((id) => id !== String(userId))
      );
    }

    socket.on("onlineUsersSnapshot", handleOnlineSnapshot);
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);

    return () => {
      socket.off("onlineUsersSnapshot", handleOnlineSnapshot);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
    };
  }, []);

  // Verify saved login session
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

        try {
          const prefsData = await getPreferences();
          const prefs = prefsData.preferences || {};

          setUserSettings((prev) => ({ ...prev, ...prefs }));

          if (prefs.theme) setTheme(prefs.theme);
        } catch {
          // Preferences may not exist yet.
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

    if (!data.token) {
      throw new Error("Login token was not received.");
    }

    localStorage.setItem("chatzoToken", data.token);
    setCurrentUser(data.user);
  }

  function handleLogout() {
    localStorage.removeItem("chatzoToken");

    setCurrentUser(null);
    setRooms([]);
    setSelectedRoom(null);
    setRoomMembers([]);
    setConversations([]);
    setSelectedConversation(null);
    setActiveChatType("room");
    setMessages([]);
    setOnlineUserIds([]);
    setTypingUserIds([]);
    setDraft("");

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = null;
  }

  async function handleSettingsChange(category, data) {
    setUserSettings((prev) => ({ ...prev, ...data }));

    if (category === "appearance") {
      setTheme(data.theme);
    }

    try {
      await savePreferences({ ...userSettings, ...data });
    } catch {
      // Save failure is non-fatal.
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
          setCurrentUser((prev) =>
            prev
              ? {
                  ...prev,
                  name: res.user.name,
                  avatar: res.user.avatar,
                }
              : prev
          );
        }
      } else if (category === "password") {
        await changePassword({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        });
      }
    } catch {
      // Update failure is non-fatal.
    }
  }

  // Theme engine
  useEffect(() => {
    const accent =
      userSettings.accentColor === "custom"
        ? userSettings.customAccent
        : ACCENT_COLOR_MAP[userSettings.accentColor] || "#08B9DF";

    const defaultChatBg =
      userSettings.theme === "light" ? "#f3f7fc" : "#020D28";

    document.documentElement.style.setProperty("--chatzo-accent", accent);
    document.documentElement.style.setProperty("--chatzo-cyan", "#08B9DF");

    document.documentElement.style.setProperty(
      "--chatzo-chat-bg",
      userSettings.chatBg === "#020D28"
        ? defaultChatBg
        : userSettings.chatBg
    );

    document.documentElement.style.setProperty(
      "--chatzo-font-size",
      FONT_SIZE_MAP[userSettings.fontSize] || "1rem"
    );
  }, [userSettings]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enteringMessageId) return;

    const timer = setTimeout(() => setEnteringMessageId(null), 500);

    return () => clearTimeout(timer);
  }, [enteringMessageId]);

  // System default theme
  useEffect(() => {
    if (userSettings.theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e) => {
      setTheme(e.matches ? "dark" : "light");
    };

    setTheme(media.matches ? "dark" : "light");

    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, [userSettings.theme]);

  // Load rooms
  async function loadRooms(searchTerm = "") {
    setRoomsLoading(true);
    setRoomError("");

    try {
      const data = searchTerm.trim()
        ? await searchRooms(searchTerm.trim())
        : await getRooms(1, 20);

      const nextRooms = data.rooms || [];
      setRooms(nextRooms);

      // Do not automatically select a room while private chat is active.
      if (activeChatType === "room") {
        if (selectedRoom) {
          const stillExists = nextRooms.some(
            (room) => room._id === selectedRoom._id
          );

          if (!stillExists) {
            setSelectedRoom(null);
            setRoomMembers([]);
            setMessages([]);
          }
        } else if (nextRooms.length > 0) {
          await selectRoom(nextRooms[0]._id);
        }
      }
    } catch (error) {
      setRoomError(error.message || "Unable to load rooms.");
    } finally {
      setRoomsLoading(false);
    }
  }

  // Load private conversations
  async function loadConversations() {
    setConversationsLoading(true);

    try {
      const data = await getConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      setRoomError(error.message || "Unable to load private conversations.");
    } finally {
      setConversationsLoading(false);
    }
  }

  // Search users
  async function handleUserSearch(searchTerm) {
    setUserSearchQuery(searchTerm);

    if (searchTerm.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }

    setUserSearchLoading(true);

    try {
      const data = await searchUsers(searchTerm.trim());
      setUserSearchResults(data.users || []);
    } catch (error) {
      setRoomError(error.message || "Unable to search users.");
      setUserSearchResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  }

  // Select an existing private conversation
  function selectPrivateConversation(conversation) {
    if (!conversation?._id) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    setActiveChatType("private");
    setSelectedConversation(conversation);
    setSelectedRoom(null);
    setRoomMembers([]);
    setMessages([]);
    setDraft("");
    setTypingUserIds([]);
    setRoomError("");
    setEnteringMessageId(null);
    setActiveNav("Messages");
  }

  // Start or open a private conversation
  async function startPrivateChat(userId) {
    setPrivateChatLoading(true);
    setRoomError("");

    try {
      const data = await createConversation(userId);
      const conversation = data.conversation;

      if (!conversation?._id) {
        throw new Error("Conversation could not be opened.");
      }

      selectPrivateConversation(conversation);
      await loadConversations();
    } catch (error) {
      setRoomError(error.message || "Unable to start private chat.");
    } finally {
      setPrivateChatLoading(false);
    }
  }

  // Select a group room
  async function selectRoom(roomId) {
    setActiveChatType("room");
    setSelectedConversation(null);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (selectedRoom?._id && socket.connected) {
      socket.emit("stopTyping", selectedRoom._id);
    }

    setTypingUserIds([]);
    setDetailLoading(true);
    setRoomError("");
    setMessages([]);
    setDraft("");
    setEnteringMessageId(null);

    try {
      const [roomData, memberData] = await Promise.all([
        getRoomById(roomId),
        getRoomMembers(roomId),
      ]);

      setSelectedRoom(roomData.room);
      setRoomMembers(memberData.members || []);
      setMessages([]);
    } catch (error) {
      setRoomError(error.message || "Unable to load room details.");
    } finally {
      setDetailLoading(false);
    }
  }

  // Initial data loading
  useEffect(() => {
    if (currentUser) {
      loadRooms("");
      loadConversations();
    }
  }, [currentUser]);

  // Room search
  useEffect(() => {
    if (!currentUser) return;

    const searchTerm = query.trim();

    const handle = setTimeout(() => {
      loadRooms(searchTerm);
    }, 300);

    return () => clearTimeout(handle);
  }, [query, currentUser, activeChatType]);

  // Group room membership
  const isMember = useMemo(() => {
    if (!selectedRoom || !currentUser) return false;

    const userId = String(currentUser.id || currentUser._id);

    return (selectedRoom.members || []).some((member) => {
      const memberId =
        typeof member === "string" ? member : member?._id;

      return String(memberId) === userId;
    });
  }, [selectedRoom, currentUser]);

  const isCreator = useMemo(() => {
    if (!selectedRoom || !currentUser) return false;

    const creatorId =
      typeof selectedRoom.createdBy === "string"
        ? selectedRoom.createdBy
        : selectedRoom.createdBy?._id;

    return String(creatorId) === String(currentUser.id || currentUser._id);
  }, [selectedRoom, currentUser]);

  // Join selected group room
  useEffect(() => {
    if (activeChatType !== "room" || !selectedRoom?._id) return;

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
  }, [activeChatType, selectedRoom?._id]);

  // Group message history and live messages
  useEffect(() => {
    if (activeChatType !== "room" || !selectedRoom?._id) return;

    const roomId = String(selectedRoom._id);

    function handleRoomJoined(data) {
      if (String(data?.roomId) === roomId) {
        socket.emit("getMessageHistory", roomId);
      }
    }

    function handleMessageHistory(payload = {}) {
      const history = Array.isArray(payload)
        ? payload
        : payload.messages || [];

      const historyRoomId = Array.isArray(payload)
        ? roomId
        : payload.roomId;

      if (String(historyRoomId) !== roomId) return;

      const formatted = history.map((message) =>
        formatSocketMessage(message, currentUser)
      );

      setMessages((prev) => {
        const byId = new Map();

        [...formatted, ...prev].forEach((message) => {
          byId.set(String(message.id), message);
        });

        return [...byId.values()].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });
    }

    function handleNewMessage(message) {
      const messageRoomId =
        typeof message?.room === "string"
          ? message.room
          : message?.room?._id;

      if (String(messageRoomId) !== roomId) return;

      const formattedMessage = formatSocketMessage(message, currentUser);

      setMessages((prev) => {
        if (
          prev.some(
            (item) => String(item.id) === String(formattedMessage.id)
          )
        ) {
          return prev;
        }

        return [...prev, formattedMessage].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });

      setEnteringMessageId(formattedMessage.id);
    }

    function handleMessageError(error) {
      setRoomError(error?.message || "Chat request failed.");
    }

    socket.on("roomJoined", handleRoomJoined);
    socket.on("messageHistory", handleMessageHistory);
    socket.on("newMessage", handleNewMessage);
    socket.on("messageError", handleMessageError);

    return () => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("messageHistory", handleMessageHistory);
      socket.off("newMessage", handleNewMessage);
      socket.off("messageError", handleMessageError);
    };
  }, [currentUser, activeChatType, selectedRoom?._id]);

  // Private conversation: join, history and live messages
  useEffect(() => {
    if (
      activeChatType !== "private" ||
      !selectedConversation?._id
    ) {
      return;
    }

    const conversationId = String(selectedConversation._id);

    function joinPrivateChat() {
      socket.emit("joinPrivateConversation", conversationId);
    }

    function handlePrivateConversationJoined(data) {
      if (String(data?.conversationId) !== conversationId) return;

      socket.emit("getPrivateMessageHistory", conversationId);
    }

    function handlePrivateMessageHistory(payload = {}) {
      if (String(payload?.conversationId) !== conversationId) return;

      const history = payload.messages || [];

      const formatted = history.map((message) =>
        formatSocketMessage(message, currentUser)
      );

      setMessages((prev) => {
        const byId = new Map();

        [...formatted, ...prev].forEach((message) => {
          byId.set(String(message.id), message);
        });

        return [...byId.values()].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });
    }

    function handleNewPrivateMessage(message) {
      const messageConversationId =
        typeof message?.conversation === "string"
          ? message.conversation
          : message?.conversation?._id;

      if (String(messageConversationId) !== conversationId) return;

      const formattedMessage = formatSocketMessage(message, currentUser);

      setMessages((prev) => {
        if (
          prev.some(
            (item) => String(item.id) === String(formattedMessage.id)
          )
        ) {
          return prev;
        }

        return [...prev, formattedMessage].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });

      setEnteringMessageId(formattedMessage.id);
    }

    function handlePrivateMessageError(error) {
      setRoomError(error?.message || "Private chat request failed.");
    }

    socket.on(
      "privateConversationJoined",
      handlePrivateConversationJoined
    );
    socket.on(
      "privateMessageHistory",
      handlePrivateMessageHistory
    );
    socket.on(
      "newPrivateMessage",
      handleNewPrivateMessage
    );
    socket.on(
      "privateMessageError",
      handlePrivateMessageError
    );

    if (socket.connected) {
      joinPrivateChat();
    }

    socket.on("connect", joinPrivateChat);

    return () => {
      socket.off("connect", joinPrivateChat);
      socket.off(
        "privateConversationJoined",
        handlePrivateConversationJoined
      );
      socket.off(
        "privateMessageHistory",
        handlePrivateMessageHistory
      );
      socket.off(
        "newPrivateMessage",
        handleNewPrivateMessage
      );
      socket.off(
        "privateMessageError",
        handlePrivateMessageError
      );
    };
  }, [currentUser, activeChatType, selectedConversation?._id]);

  // Group typing indicators
  useEffect(() => {
    if (activeChatType !== "room" || !selectedRoom?._id) {
      setTypingUserIds([]);
      return;
    }

    const selfId = String(currentUser?.id || currentUser?._id || "");

    function handleUserTyping({ userId } = {}) {
      if (!userId || String(userId) === selfId) return;

      setTypingUserIds((prev) =>
        prev.includes(String(userId)) ? prev : [...prev, String(userId)]
      );
    }

    function handleUserStoppedTyping({ userId } = {}) {
      if (!userId) return;

      setTypingUserIds((prev) =>
        prev.filter((id) => id !== String(userId))
      );
    }

    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);

    return () => {
      socket.off("userTyping", handleUserTyping);
      socket.off("userStoppedTyping", handleUserStoppedTyping);
      setTypingUserIds([]);
    };
  }, [currentUser, activeChatType, selectedRoom?._id]);

  // Room membership action
  async function handleMembershipAction() {
    if (!selectedRoom) return;

    setActionLoading(true);
    setRoomError("");

    try {
      if (isMember) {
        socket.emit("leaveRoom", selectedRoom._id);
        await leaveRoom(selectedRoom._id);
      } else {
        await joinRoom(selectedRoom._id);
      }

      await selectRoom(selectedRoom._id);
      await loadRooms(query);
    } catch (error) {
      setRoomError(
        error.message || "Room membership could not be updated."
      );
    } finally {
      setActionLoading(false);
    }
  }

  // Create room
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

      setActiveChatType("room");
      await loadRooms("");

      if (createdRoom?._id) {
        await selectRoom(createdRoom._id);
      }

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

  // Update room
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

  // Delete room
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
      setMessages([]);

      await loadRooms(query);
    } catch (error) {
      setRoomError(error.message || "Unable to delete room.");
    } finally {
      setDeleteLoading(false);
    }
  }

  // Draft and typing handling
  function handleDraftChange(value) {
    setDraft(value);

    // Private typing events are not implemented on the backend yet.
    if (activeChatType !== "room") return;

    if (!selectedRoom || !isMember || !socketConnected) return;

    if (!value.trim()) {
      socket.emit("stopTyping", selectedRoom._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = null;
      return;
    }

    socket.emit("typing", selectedRoom._id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", selectedRoom._id);
      typingTimeoutRef.current = null;
    }, 1000);
  }

  // Send group or private message
  function sendMessage(e) {
    e.preventDefault();

    const messageText = draft.trim();

    if (!messageText) return;

    if (!socketConnected) {
      setRoomError(
        "Not connected to the chat server. Please try again."
      );
      return;
    }

    // Private message
    if (activeChatType === "private") {
      if (!selectedConversation?._id) return;

      socket.emit("sendPrivateMessage", {
        conversationId: selectedConversation._id,
        text: messageText,
      });

      setDraft("");
      setRoomError("");
      return;
    }

    // Group message
    if (!selectedRoom || !isMember) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = null;

    socket.emit("stopTyping", selectedRoom._id);
    setRoomError("");

    socket.emit("sendMessage", {
      roomId: selectedRoom._id,
      text: messageText,
    });

    setDraft("");
  }

  // Authentication loading
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

  // Identify the other private-chat participant
  const currentUserId = String(currentUser.id || currentUser._id);

  const privateOtherUser = selectedConversation?.participants?.find(
    (participant) =>
      String(participant?._id || participant?.id || participant) !==
      currentUserId
  );

  const privateOtherUserId = String(
    privateOtherUser?._id || privateOtherUser?.id || ""
  );

  const selectedName =
    activeChatType === "private"
      ? privateOtherUser?.name || "Private Chat"
      : selectedRoom?.name || "Select a room";

  const selectedInitials = getInitials(selectedName);

  const privateUserOnline =
    privateOtherUserId &&
    onlineUserIds.includes(privateOtherUserId);

  const creatorName =
    selectedRoom?.createdBy?.name || "Unknown creator";

  const typingNames = typingUserIds
    .map((id) =>
      roomMembers.find(
        (member) => String(member._id || member.id) === id
      )?.name
    )
    .filter(Boolean);

  const onlineMemberCount = roomMembers.filter((member) =>
    onlineUserIds.includes(String(member._id || member.id))
  ).length;

  // Render app
  return (
    <div className={`app ${theme}`}>
      <aside className="rail">
        <div className="brand-mark">
          <Logo size={30} />
        </div>

        <div className="rail-separator" />

        <button
          className={`rail-btn ${activeNav === "Home" ? "active" : ""}`}
          title="Home"
          onClick={() => setActiveNav("Home")}
        >
          <Home />
        </button>

        <button
          className={`rail-btn ${activeNav === "Messages" ? "active" : ""}`}
          title="Messages"
          onClick={() => setActiveNav("Messages")}
        >
          <MessageCircle />
        </button>

        <button
          className={`rail-btn ${activeNav === "Contacts" ? "active" : ""}`}
          title="Contacts"
          onClick={() => setActiveNav("Contacts")}
        >
          <Users />
        </button>

        <div className="rail-spacer" />

        <button
          className={`rail-btn ${activeNav === "Settings" ? "active" : ""}`}
          title="Settings"
          onClick={() => setActiveNav("Settings")}
        >
          <Settings />
        </button>

        <button
          className="rail-profile"
          title="Profile"
          onClick={() => setActiveNav("Profile")}
        >
          <Avatar
            initials={getInitials(currentUser.name || "User")}
            color="cyan"
          />
        </button>
      </aside>

      {activeNav === "Settings" ? (
        <SettingsPage
          currentUser={currentUser}
          onUpdate={handleProfileUpdate}
          onSettingsChange={handleSettingsChange}
          onLogout={handleLogout}
        />
      ) : activeNav === "Home" ? (
        <div className="home-page">
          <div className="home-header">
            <div className="home-greeting">
              <h1>Welcome back, {currentUser?.name || "User"}!</h1>
              <p>Here's what's happening in CHATZO today.</p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setActiveNav("Messages")}
            >
              Go to Messages <Send size={16} />
            </button>
          </div>

          <div className="home-stats">
            <div className="stat-card">
              <span className="stat-label">Total Rooms</span>
              <span className="stat-value">{rooms.length}</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Private Conversations</span>
              <span className="stat-value">{conversations.length}</span>
            </div>
          </div>

          <div className="home-actions">
            <h3>Quick Actions</h3>

            <div className="action-grid">
              <button
                className="action-btn"
                onClick={() => {
                  setRoomError("");
                  setShowCreateRoom(true);
                }}
              >
                <Plus size={18} /> Create Room
              </button>

              <button
                className="action-btn"
                onClick={() => setActiveNav("Messages")}
              >
                <MessageCircle size={18} /> Browse Rooms
              </button>

              <button
                className="action-btn"
                onClick={() => setActiveNav("Contacts")}
              >
                <Users size={18} /> Find Contacts
              </button>

              <button
                className="action-btn"
                onClick={() => setActiveNav("Settings")}
              >
                <Settings size={18} /> App Settings
              </button>
            </div>
          </div>
        </div>
      ) : activeNav === "Contacts" ? (
        <div className="contacts-page">
          <div className="contacts-header">
            <div>
              <span className="eyebrow">CONNECT WITH PEOPLE</span>
              <h1>Contacts</h1>
              <p>Search users and start private conversations.</p>
            </div>
          </div>

          <div className="contacts-search">
            <Search size={19} />

            <input
              value={userSearchQuery}
              onChange={(e) => handleUserSearch(e.target.value)}
              placeholder="Search people by name..."
            />

            {userSearchLoading && <span>Searching...</span>}
          </div>

          {roomError && (
            <div className="room-error">{roomError}</div>
          )}

          <div className="contacts-results">
            <h3>SEARCH RESULTS</h3>

            {userSearchQuery.trim().length < 2 ? (
              <div className="empty-search">
                Enter at least 2 characters to find users.
              </div>
            ) : userSearchLoading ? (
              <div className="empty-search">Searching users...</div>
            ) : userSearchResults.length === 0 ? (
              <div className="empty-search">No users found.</div>
            ) : (
              userSearchResults.map((user) => (
                <div className="contact-result" key={user._id}>
                  <Avatar
                    initials={getInitials(user.name)}
                    color="cyan"
                    online={onlineUserIds.includes(String(user._id))}
                  />

                  <div className="chat-copy">
                    <strong>{user.name}</strong>
                    <span>
                      {onlineUserIds.includes(String(user._id))
                        ? "Online"
                        : "CHATZO user"}
                    </span>
                  </div>

                  <button
                    className="contact-message-btn"
                    disabled={privateChatLoading}
                    onClick={() => startPrivateChat(user._id)}
                  >
                    <MessageCircle size={15} />
                    Message
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            className="btn btn-primary contacts-back"
            onClick={() => setActiveNav("Messages")}
          >
            Back to Messages
          </button>
        </div>
      ) : activeNav === "Profile" ? (
        <div className="profile-page">
          <div className="profile-card">
            <div className="profile-avatar">
              <Avatar
                initials={getInitials(currentUser.name || "User")}
                color="cyan"
                large
              />
            </div>

            <h2>{currentUser.name}</h2>
            <p className="profile-email">{currentUser.email}</p>
            <p className="profile-id">
              Account ID: {currentUser.id || currentUser._id}
            </p>

            <div className="profile-actions">
              <button
                className="btn btn-primary"
                onClick={() => setActiveNav("Settings")}
                style={{ width: "100%" }}
              >
                Edit Profile in Settings
              </button>

              <button
                className="btn btn-outline"
                onClick={() => setActiveNav("Messages")}
                style={{ width: "100%", marginTop: 8 }}
              >
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
                <h1>
                  Rooms <span className="count-pill">{rooms.length}</span>
                </h1>
              </div>

              <button
                className="icon-btn new-chat create-room-trigger"
                title="Create a room"
                onClick={() => {
                  setRoomError("");
                  setShowCreateRoom(true);
                }}
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="search-box">
              <Search size={17} />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rooms..."
              />

              <kbd>⌘ K</kbd>
            </div>

            <div className="filter-row">
              <button className="filter active">
                All <span>{rooms.length}</span>
              </button>

              <button
                className="filter"
                onClick={() => setQuery("")}
              >
                Clear search
              </button>
            </div>

            <div className="section-label">
              AVAILABLE ROOMS <MoreHorizontal size={17} />
            </div>

            <div className="chat-list">
              {roomsLoading && (
                <div className="empty-search">Loading rooms...</div>
              )}

              {!roomsLoading &&
                rooms.map((room, index) => (
                  <button
                    key={room._id}
                    onClick={() => selectRoom(room._id)}
                    className={`chat-item ${
                      activeChatType === "room" &&
                      selectedRoom?._id === room._id
                        ? "selected"
                        : ""
                    }`}
                  >
                    <Avatar
                      initials={getInitials(room.name)}
                      color={
                        ["violet", "blue", "orange", "pink", "cyan"][
                          index % 5
                        ]
                      }
                    />

                    <div className="chat-copy">
                      <div className="chat-name-row">
                        <strong>{room.name}</strong>
                        <span>{room.members?.length ?? ""}</span>
                      </div>

                      {userSettings.chatPrefs.messagePreview && (
                        <div className="chat-preview">
                          {room.description || "No description"}
                        </div>
                      )}
                    </div>
                  </button>
                ))}

              {!roomsLoading && rooms.length === 0 && (
                <div className="empty-search">
                  No rooms found. Try another search.
                </div>
              )}
            </div>

            {/* Direct Messages */}
            <div className="section-label">
              DIRECT MESSAGES
              <span>{conversations.length}</span>
            </div>

            <div className="chat-list direct-message-list">
              {conversationsLoading && (
                <div className="empty-search">
                  Loading conversations...
                </div>
              )}

              {!conversationsLoading &&
                conversations.map((conversation) => {
                  const otherUser = conversation.participants?.find(
                    (participant) =>
                      String(
                        participant?._id ||
                          participant?.id ||
                          participant
                      ) !== currentUserId
                  );

                  if (!otherUser) return null;

                  const otherUserId = String(
                    otherUser._id || otherUser.id
                  );

                  const isOnline = onlineUserIds.includes(otherUserId);

                  return (
                    <button
                      key={conversation._id}
                      className={`chat-item ${
                        activeChatType === "private" &&
                        selectedConversation?._id === conversation._id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        selectPrivateConversation(conversation)
                      }
                    >
                      <Avatar
                        initials={getInitials(otherUser.name || "User")}
                        color="cyan"
                        online={isOnline}
                      />

                      <div className="chat-copy">
                        <div className="chat-name-row">
                          <strong>{otherUser.name || "User"}</strong>
                        </div>

                        <div className="chat-preview">
                          {isOnline ? "Online" : "Offline"}
                        </div>
                      </div>
                    </button>
                  );
                })}

              {!conversationsLoading && conversations.length === 0 && (
                <div className="empty-search">
                  No private conversations yet.
                  Find someone in Contacts to start chatting.
                </div>
              )}
            </div>

            <div className="sidebar-footer">
              <div className="sync-indicator" />
              <span>
                {socketConnected
                  ? "Connected to CHATZO"
                  : "Connecting to server..."}
              </span>
              <span className="footer-version">CHATZO 1.0</span>
            </div>
          </aside>

          {/* Create room modal */}
          {showCreateRoom && (
            <div
              className="room-modal-backdrop"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowCreateRoom(false);
                }
              }}
            >
              <form className="room-modal" onSubmit={handleCreateRoom}>
                <div className="room-modal-heading">
                  <div>
                    <span className="eyebrow">
                      NEW CONVERSATION SPACE
                    </span>
                    <h2>Create a room</h2>
                    <p>
                      Give your room a name and an optional description.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Close"
                    onClick={() => setShowCreateRoom(false)}
                  >
                    ×
                  </button>
                </div>

                <label className="room-field">
                  Room name
                  <input
                    autoFocus
                    maxLength={50}
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Project Team"
                    required
                  />
                </label>

                <label className="room-field">
                  Description <span>(optional)</span>
                  <textarea
                    maxLength={250}
                    rows={3}
                    value={newRoomDescription}
                    onChange={(e) =>
                      setNewRoomDescription(e.target.value)
                    }
                    placeholder="What is this room about?"
                  />
                </label>

                {roomError && (
                  <div className="room-error">{roomError}</div>
                )}

                <div className="room-modal-actions">
                  <button
                    type="button"
                    className="room-cancel-btn"
                    onClick={() => setShowCreateRoom(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="room-create-btn"
                    disabled={createLoading || !newRoomName.trim()}
                  >
                    {createLoading ? "Creating..." : "Create room"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit room modal */}
          {showEditRoom && selectedRoom && (
            <div
              className="room-modal-backdrop"
              onClick={(e) => {
                if (
                  e.target === e.currentTarget &&
                  !editLoading
                ) {
                  setShowEditRoom(false);
                }
              }}
            >
              <form className="room-modal" onSubmit={handleUpdateRoom}>
                <div className="room-modal-heading">
                  <div>
                    <span className="eyebrow">ROOM SETTINGS</span>
                    <h2>Edit room</h2>
                    <p>Update this room's name and description.</p>
                  </div>

                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Close"
                    onClick={() => setShowEditRoom(false)}
                    disabled={editLoading}
                  >
                    ×
                  </button>
                </div>

                <label className="room-field">
                  Room name
                  <input
                    autoFocus
                    maxLength={50}
                    value={editRoomName}
                    onChange={(e) => setEditRoomName(e.target.value)}
                    placeholder="Room name"
                    required
                  />
                </label>

                <label className="room-field">
                  Description <span>(optional)</span>
                  <textarea
                    maxLength={250}
                    rows={3}
                    value={editRoomDescription}
                    onChange={(e) =>
                      setEditRoomDescription(e.target.value)
                    }
                    placeholder="What is this room about?"
                  />
                </label>

                {roomError && (
                  <div className="room-error">{roomError}</div>
                )}

                <div className="room-modal-actions">
                  <button
                    type="button"
                    className="room-cancel-btn"
                    onClick={() => setShowEditRoom(false)}
                    disabled={editLoading}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="room-create-btn"
                    disabled={editLoading || !editRoomName.trim()}
                  >
                    {editLoading ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Main conversation */}
          <main className="conversation">
            <header className="conversation-header">
              <div className="contact-heading">
                <Avatar
                  initials={selectedInitials}
                  color="cyan"
                  large
                  online={
                    activeChatType === "private"
                      ? Boolean(privateUserOnline)
                      : false
                  }
                />

                <div>
                  <h2>{selectedName}</h2>

                  <p>
                    {activeChatType === "private"
                      ? privateUserOnline
                        ? "Online"
                        : "Offline"
                      : selectedRoom
                        ? `${onlineMemberCount} Online`
                        : "Choose a room to view details"}
                  </p>
                </div>
              </div>

              <div className="header-actions">
                {selectedRoom && activeChatType === "room" && (
                  <button
                    className="icon-btn"
                    title="Room members"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    <Info />
                  </button>
                )}

                <button
                  className="icon-btn theme-toggle"
                  title="Toggle theme"
                  onClick={() => {
                    const next = theme === "dark" ? "light" : "dark";

                    setTheme(next);
                    setUserSettings((prev) => ({
                      ...prev,
                      theme: next,
                    }));
                  }}
                >
                  {theme === "dark" ? <Sun /> : <Moon />}
                </button>
              </div>
            </header>

            {roomError && (
              <div className="room-error" role="alert">
                {roomError}
              </div>
            )}

            {detailLoading && activeChatType === "room" ? (
              <section
                className={`messages-area bubble-style-${userSettings.bubbleStyle} chat-bg-custom`}
              >
                <div className="empty-search">
                  Loading room details...
                </div>
              </section>
            ) : activeChatType === "private" && selectedConversation ? (
              <section
                className={`messages-area bubble-style-${userSettings.bubbleStyle} chat-bg-custom`}
              >
                <div className="date-divider">
                  <span />
                  <p>PRIVATE CONVERSATION</p>
                  <span />
                </div>

                {messages.length === 0 ? (
                  <div className="message-intro">
                    <div className="intro-icon">
                      <MessageCircle size={20} />
                    </div>

                    <strong>Start a conversation</strong>

                    <p>
                      Send your first private message to{" "}
                      {privateOtherUser?.name || "this user"}.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message-row ${msg.mine ? "mine" : ""}${
                        msg.id === enteringMessageId
                          ? " message-entering"
                          : ""
                      }`}
                    >
                      <div className="message-content">
                        {!msg.mine && (
                          <span className="message-author">
                            {msg.author}
                          </span>
                        )}

                        <div className="bubble">{msg.text}</div>

                        <div className="message-meta">
                          {userSettings.chatPrefs.showTimestamps && (
                            <span>{msg.time}</span>
                          )}

                          {msg.mine && (
                            <CheckCheck
                              size={14}
                              className="read-check"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>
            ) : selectedRoom && activeChatType === "room" ? (
              <section
                className={`messages-area bubble-style-${userSettings.bubbleStyle} chat-bg-custom`}
              >
                <div className="message-intro">
                  <div className="intro-icon">
                    <Users size={20} />
                  </div>

                  <strong>{selectedRoom.name}</strong>

                  <p>
                    {selectedRoom.description ||
                      "This room has no description yet."}
                  </p>

                  <p>Created by {creatorName}</p>
                  <p>{roomMembers.length} room member(s)</p>

                  <button
                    className="membership-btn"
                    onClick={handleMembershipAction}
                    disabled={actionLoading || isCreator}
                  >
                    {actionLoading
                      ? "Please wait..."
                      : isCreator
                        ? "Room creator"
                        : isMember
                          ? "Leave room"
                          : "Join room"}
                  </button>

                  {isCreator && (
                    <div className="room-owner-actions">
                      <button
                        type="button"
                        className="room-edit-btn"
                        onClick={openEditRoom}
                      >
                        Edit room
                      </button>

                      <button
                        type="button"
                        className="room-delete-btn"
                        onClick={handleDeleteRoom}
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? "Deleting..." : "Delete room"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="date-divider">
                  <span />
                  <p>ROOM PREVIEW</p>
                  <span />
                </div>

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message-row ${msg.mine ? "mine" : ""}${
                      msg.id === enteringMessageId
                        ? " message-entering"
                        : ""
                    }`}
                  >
                    <div className="message-content">
                      {!msg.mine && (
                        <span className="message-author">
                          {msg.author}
                        </span>
                      )}

                      <div className="bubble">{msg.text}</div>

                      <div className="message-meta">
                        {userSettings.chatPrefs.showTimestamps && (
                          <span>{msg.time}</span>
                        )}

                        {msg.mine && (
                          <CheckCheck
                            size={14}
                            className="read-check"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {typingNames.length > 0 && (
                  <div className="typing-row">
                    <div className="typing-bubble">
                      <span className="typing-text">
                        {typingNames.length === 1
                          ? `${typingNames[0]} is typing`
                          : `${typingNames.join(", ")} are typing`}
                      </span>

                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section
                className={`messages-area bubble-style-${userSettings.bubbleStyle} chat-bg-custom`}
              >
                <div className="message-intro">
                  <div className="intro-icon">
                    <MessageCircle size={20} />
                  </div>

                  <strong>No conversation selected</strong>

                  <p>
                    Select a room or private conversation from the sidebar.
                  </p>
                </div>
              </section>
            )}

            {/* Message composer */}
            <form className="composer-wrap" onSubmit={sendMessage}>
              <div className="composer">
                <button
                  type="button"
                  className="composer-tool"
                  title="Attach file"
                  disabled
                >
                  <Paperclip />
                </button>

                <button
                  type="button"
                  className="composer-tool"
                  title="Add image"
                  disabled
                >
                  <Image />
                </button>

                <input
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onBlur={() => {
                    if (
                      activeChatType === "room" &&
                      selectedRoom &&
                      socket.connected
                    ) {
                      socket.emit("stopTyping", selectedRoom._id);
                    }

                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                    }

                    typingTimeoutRef.current = null;
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !userSettings.chatPrefs.enterToSend
                    ) {
                      e.preventDefault();
                    }
                  }}
                  placeholder={
                    activeChatType === "private"
                      ? selectedConversation
                        ? `Message ${privateOtherUser?.name || "user"}...`
                        : "Select a conversation first"
                      : !selectedRoom
                        ? "Select a room first"
                        : !isMember
                          ? "Join this room to send messages"
                          : `Message ${selectedRoom.name}...`
                  }
                  disabled={
                    activeChatType === "private"
                      ? !selectedConversation
                      : !selectedRoom || !isMember
                  }
                />

                <button
                  type="button"
                  className="composer-tool emoji"
                  title="Emoji"
                  disabled
                >
                  <Smile />
                </button>

                <button
                  type="submit"
                  className="send-btn"
                  disabled={
                    !draft.trim() ||
                    !socketConnected ||
                    (activeChatType === "private"
                      ? !selectedConversation
                      : !selectedRoom || !isMember)
                  }
                >
                  <Send size={17} />
                </button>
              </div>

              <div className="composer-hint">
                <span>
                  {!socketConnected
                    ? "Connecting to chat server..."
                    : activeChatType === "private"
                      ? "Connected · Private messaging enabled"
                      : isMember
                        ? "Connected · Real-time messaging enabled"
                        : "Join this room to participate in the conversation."}
                </span>
              </div>
            </form>
          </main>

          {/* Group room details */}
          {showDetails &&
            selectedRoom &&
            activeChatType === "room" && (
              <aside className="details-panel">
                <div className="details-head">
                  <strong>Room details</strong>

                  <button
                    className="icon-btn"
                    onClick={() => setShowDetails(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="details-person">
                  <Avatar
                    initials={selectedInitials}
                    color="cyan"
                    large
                  />

                  <h3>{selectedRoom.name}</h3>
                  <p>Chat room</p>
                </div>

                <div className="details-block">
                  <span>ABOUT</span>

                  <p>
                    {selectedRoom.description ||
                      "No description provided."}
                  </p>

                  <p>Created by: {creatorName}</p>
                </div>

                <div className="details-block">
                  <span>MEMBERS ({roomMembers.length})</span>

                  {roomMembers.map((member) => {
                    const isOnline = onlineUserIds.includes(
                      String(member._id || member.id)
                    );

                    return (
                      <div
                        className="chat-item"
                        key={member._id || member.id}
                      >
                        <Avatar
                          initials={getInitials(member.name)}
                          color="blue"
                          online={isOnline}
                        />

                        <div className="chat-copy">
                          <div className="chat-name-row">
                            <strong>{member.name}</strong>

                            <span
                              style={{
                                color: isOnline
                                  ? "#22c55e"
                                  : "var(--muted)",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            >
                              {isOnline ? "Online" : "Offline"}
                            </span>
                          </div>

                          <div className="chat-preview">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {roomMembers.length === 0 && (
                    <p>No members found.</p>
                  )}
                </div>
              </aside>
            )}
        </div>
      )}
    </div>
  );
}
