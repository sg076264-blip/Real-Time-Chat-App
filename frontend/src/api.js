const API_BASE = "http://localhost:5001/api";

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("chatzoToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed (${response.status})`);
  }
  return data;
}

export const signupUser = (userData) =>
  apiRequest("/auth/signup", { method: "POST", body: JSON.stringify(userData) });

export const loginUser = (userData) =>
  apiRequest("/auth/login", { method: "POST", body: JSON.stringify(userData) });

export const getCurrentUser = (token) =>
  apiRequest("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getRooms = (page = 1, limit = 20) =>
  apiRequest(`/rooms?page=${page}&limit=${limit}`);

export const searchRooms = (name) =>
  apiRequest(`/rooms/search?name=${encodeURIComponent(name)}`);

export const getRoomById = (roomId) =>
  apiRequest(`/rooms/${roomId}`);

export const getRoomMembers = (roomId) =>
  apiRequest(`/rooms/${roomId}/members`);

export const createRoom = (roomData) =>
  apiRequest("/rooms", { method: "POST", body: JSON.stringify(roomData) });

export const joinRoom = (roomId) =>
  apiRequest(`/rooms/${roomId}/join`, { method: "POST" });

export const leaveRoom = (roomId) =>
  apiRequest(`/rooms/${roomId}/leave`, { method: "POST" });

export const updateRoom = (roomId, roomData) =>
  apiRequest(`/rooms/${roomId}`, {
    method: "PUT",
    body: JSON.stringify(roomData),
  });

export const deleteRoom = (roomId) =>
  apiRequest(`/rooms/${roomId}`, { method: "DELETE" });

// Preferences APIs (authenticated via JWT)
export const getPreferences = () =>
  apiRequest("/auth/preferences", { method: "GET" });

export const savePreferences = (preferences) =>
  apiRequest("/auth/preferences", {
    method: "PUT",
    body: JSON.stringify({ preferences }),
  });

export const updateProfile = (profileData) =>
  apiRequest("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });

export const changePassword = (passwordData) =>
  apiRequest("/auth/change-password", {
    method: "PUT",
    body: JSON.stringify(passwordData),
  });

export const forgotPassword = (email) =>
  apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token, newPassword) =>
  apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
