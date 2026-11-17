import React, { useState, useCallback, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Image as ImageIcon,
  Sun,
  Moon,
  Monitor,
  Palette,
  Shield,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Clock,
  Type,
  Layout,
  TextCursor,
  Database,
  Trash2,
  RefreshCw,
  HelpCircle,
  FileText,
  FileCheck,
  Link,
  Send,
} from "lucide-react";
import { getPreferences, forgotPassword, resetPassword, changePassword } from "../../api";
import "./settings.css";

/* ------------------------------------------------------------------ */
/*  Predefined accent colors                                          */
/* ------------------------------------------------------------------ */
const ACCENT_COLORS = [
  { key: "cyan", label: "CHATZO Cyan", value: "#08B9DF" },
  { key: "blue", label: "Blue", value: "#2563EB" },
  { key: "purple", label: "Purple", value: "#7E2FCE" },
  { key: "green", label: "Green", value: "#16A34A" },
  { key: "pink", label: "Pink", value: "#DB2777" },
  { key: "orange", label: "Orange", value: "#EA580C" },
];

const FONT_SIZES = [
  { key: "sm", label: "Small", value: "0.875rem" },
  { key: "md", label: "Medium", value: "1rem" },
  { key: "lg", label: "Large", value: "1.125rem" },
];

const BUBBLE_STYLES = [
  { key: "rounded", label: "Rounded", icon: "rounded" },
  { key: "square", label: "Square", icon: "square" },
];

const THEMES = [
  { key: "light", label: "Light Mode", icon: <Sun size={16} /> },
  { key: "dark", label: "Dark Mode", icon: <Moon size={16} /> },
  { key: "system", label: "System Default", icon: <Monitor size={16} /> },
];

/* ------------------------------------------------------------------ */
/*  Settings — main dashboard                                         */
/* ------------------------------------------------------------------ */
export default function Settings({ currentUser, onUpdate, onSettingsChange, onLogout }) {
  const [category, setCategory] = useState("account");

  /* Account & Profile state */
  const [profile, setProfile] = useState({
    displayName: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: "",
    avatar: currentUser?.avatar || "",
  });
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [cpCurrentPassword, setCpCurrentPassword] = useState("");
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpShowConfirm, setCpShowConfirm] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState("");
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");
  const [fpSuccess, setFpSuccess] = useState("");
  const [rpToken, setRpToken] = useState("");
  const [rpNewPassword, setRpNewPassword] = useState("");
  const [rpConfirmPassword, setRpConfirmPassword] = useState("");
  const [rpShowNew, setRpShowNew] = useState(false);
  const [rpShowConfirm, setRpShowConfirm] = useState(false);
  const [rpLoading, setRpLoading] = useState(false);
  const [rpError, setRpError] = useState("");
  const [rpSuccess, setRpSuccess] = useState("");

  /* Appearance & Themes state */
  const [appearance, setAppearance] = useState({
    theme: "dark",
    accentColor: "cyan",
    customAccent: "#08B9DF",
    bubbleStyle: "rounded",
    chatBg: "#020D28",
    sidebar: "dark",
    fontSize: "md",
  });

  /* Privacy & Security state */
  const [privacy, setPrivacy] = useState({
    onlineStatus: true,
    lastSeen: true,
    profileVisibility: "everyone",
    blockedUsers: [],
  });

  /* Notifications state */
  const [notifications, setNotifications] = useState({
    messages: true,
    sound: true,
    rooms: true,
    previews: true,
    muted: [],
  });

  /* Chat Preferences state */
  const [chatPrefs, setChatPrefs] = useState({
    enterToSend: true,
    showTimestamps: true,
    messagePreview: true,
  });

  /* Logout confirmation state */
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  /* Load saved preferences from the backend when the user is available */
  useEffect(() => {
    if (!currentUser) return;

    let mounted = true;
    const loadPreferences = async () => {
      try {
        const data = await getPreferences();
        const prefs = data.preferences || {};

        if (!mounted) return;

        // Appearance
        setAppearance((prev) => ({
          ...prev,
          theme: prefs.theme ?? prev.theme,
          accentColor: prefs.accentColor ?? prev.accentColor,
          customAccent: prefs.customAccent ?? prev.customAccent,
          bubbleStyle: prefs.bubbleStyle ?? prev.bubbleStyle,
          chatBg: prefs.chatBg ?? prev.chatBg,
          sidebar: prefs.sidebar ?? prev.sidebar,
          fontSize: prefs.fontSize ?? prev.fontSize,
        }));

        // Privacy
        setPrivacy((prev) => ({
          ...prev,
          onlineStatus: prefs.onlineStatus ?? prev.onlineStatus,
          lastSeen: prefs.lastSeen ?? prev.lastSeen,
          profileVisibility: prefs.profileVisibility ?? prev.profileVisibility,
          blockedUsers: Array.isArray(prefs.blockedUsers) ? prefs.blockedUsers : prev.blockedUsers,
        }));

        // Notifications
        setNotifications((prev) => ({
          ...prev,
          ...(prefs.notifications || {}),
          muted: Array.isArray(prefs.muted) ? prefs.muted : prev.muted,
        }));

        // Chat prefs
        setChatPrefs((prev) => ({
          ...prev,
          ...(prefs.chatPrefs || {}),
        }));

        // Profile (phone/avatar come from preferences or currentUser)
        setProfile((prev) => ({
          ...prev,
          phone: prefs.phone ?? prev.phone,
          avatar: prefs.avatar ?? prev.avatar,
        }));
      } catch {
        // Preferences may not exist yet; keep defaults.
      }
    };

    loadPreferences();
    return () => { mounted = false; };
  }, [currentUser]);

  const handleInput = useCallback((key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveAccount = () => {
    if (onUpdate) onUpdate("account", profile);
  };

  const openChangePasswordModal = () => {
    setCpCurrentPassword("");
    setCpNewPassword("");
    setCpConfirmPassword("");
    setCpShowCurrent(false);
    setCpShowNew(false);
    setCpShowConfirm(false);
    setCpLoading(false);
    setCpError("");
    setCpSuccess("");
    setShowChangePasswordModal(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setCpError("");
    setCpSuccess("");

    if (!cpCurrentPassword || !cpNewPassword || cpNewPassword.length < 6) {
      setCpError("Please fill in all fields. New password must be at least 6 characters.");
      return;
    }

    if (cpNewPassword !== cpConfirmPassword) {
      setCpError("Passwords do not match.");
      return;
    }

    setCpLoading(true);

    try {
      await changePassword({
        currentPassword: cpCurrentPassword,
        newPassword: cpNewPassword,
      });
      setCpSuccess("Password changed successfully!");
      setCpLoading(false);
      setCpCurrentPassword("");
      setCpNewPassword("");
      setCpConfirmPassword("");
      setTimeout(() => setShowChangePasswordModal(false), 1500);
    } catch (err) {
      setCpError(err.message || "Failed to change password.");
      setCpLoading(false);
    }
  };

  const toggleCpVisibility = (field) => {
    if (field === "current") setCpShowCurrent((prev) => !prev);
    if (field === "new") setCpShowNew((prev) => !prev);
    if (field === "confirm") setCpShowConfirm((prev) => !prev);
  };

  const openForgotPasswordModal = () => {
    setFpEmail("");
    setFpLoading(false);
    setFpError("");
    setFpSuccess("");
    setShowForgotPasswordModal(true);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setFpError("");
    setFpSuccess("");

    if (!fpEmail.trim()) {
      setFpError("Please enter your email address.");
      return;
    }

    setFpLoading(true);

    try {
      await forgotPassword(fpEmail.trim());
      setFpSuccess("If an account exists for this email, a reset link has been generated.");
      setFpLoading(false);
      setFpEmail("");
    } catch (err) {
      setFpError(err.message || "Failed to process request.");
      setFpLoading(false);
    }
  };

  const openResetPasswordModal = (token) => {
    setRpToken(token);
    setRpNewPassword("");
    setRpConfirmPassword("");
    setRpShowNew(false);
    setRpShowConfirm(false);
    setRpLoading(false);
    setRpError("");
    setRpSuccess("");
    setShowForgotPasswordModal(false);
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setRpError("");
    setRpSuccess("");

    if (!rpNewPassword || rpNewPassword.length < 6) {
      setRpError("New password must be at least 6 characters.");
      return;
    }

    if (rpNewPassword !== rpConfirmPassword) {
      setRpError("Passwords do not match.");
      return;
    }

    setRpLoading(true);

    try {
      await resetPassword(rpToken, rpNewPassword);
      setRpSuccess("Password has been reset successfully!");
      setRpLoading(false);
      setTimeout(() => setShowResetPasswordModal(false), 1500);
    } catch (err) {
      setRpError(err.message || "Failed to reset password.");
      setRpLoading(false);
    }
  };

  const toggleRpVisibility = (field) => {
    if (field === "new") setRpShowNew((prev) => !prev);
    if (field === "confirm") setRpShowConfirm((prev) => !prev);
  };

  const togglePrivacy = (key) => {
    setPrivacy((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (onSettingsChange) onSettingsChange("privacy", next);
      return next;
    });
  };

  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (onSettingsChange) onSettingsChange("notifications", next);
      return next;
    });
  };

  const toggleChatPref = (key) => {
    setChatPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (onSettingsChange) onSettingsChange("chat", next);
      return next;
    });
  };

  const categories = [
    { key: "account", label: "Account & Profile", icon: <User size={16} /> },
    { key: "appearance", label: "Appearance & Themes", icon: <Palette size={16} /> },
    { key: "privacy", label: "Privacy & Security", icon: <Shield size={16} /> },
    { key: "notifications", label: "Notifications", icon: <Bell size={16} /> },
    { key: "chat", label: "Chat Preferences", icon: <Type size={16} /> },
    { key: "storage", label: "Storage & Data", icon: <Database size={16} /> },
    { key: "help", label: "Help & About", icon: <HelpCircle size={16} /> },
  ];

  return (
    <div className="settings-page">
      <div className="settings-container">
        {/* ==================== Category Sidebar ==================== */}
        <nav className="settings-sidebar">
          <div className="settings-header">
            <div className="settings-brand">
              <div className="brand-mark" aria-hidden="true">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="8" y="14" width="46" height="40" rx="13" fill="#08B9DF" />
                  <path
                    d="M30 54 L44 54 L46 62 L28 54 Z"
                    fill="#08B9DF"
                  />
                  <path
                    d="M16 24 C16 24 16 40 26 40 C30 40 30 24 30 24 L34 24 C38 24 40 26 40 28 C40 40 32 46 26 46 C20 46 16 40 16 40 Z"
                    fill="white"
                    fillOpacity={0.92}
                  />
                </svg>
              </div>
              <span className="brand-text">CHATZO Settings</span>
            </div>
            <p className="settings-subtitle">Manage your account and preferences</p>
          </div>

          <div className="settings-divider" />

          <ul className="settings-list">
            {categories.map((cat) => {
              const isActive = category === cat.key;
              return (
                <li key={cat.key}>
                  <button
                    className={`settings-item ${isActive ? "active" : ""}`}
                    onClick={() => setCategory(cat.key)}
                    title={cat.label}
                  >
                    <span className="item-icon" aria-hidden="true">{cat.icon}</span>
                    <span className="item-label">{cat.label}</span>
                    {isActive && <span className="item-indicator" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="settings-spacer" />

          <div className="settings-footer">
            <div className="footer-user">
              <div className="footer-avatar">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="footer-info">
                <div className="footer-name">{currentUser?.name || "User"}</div>
                <div className="footer-email">{currentUser?.email || ""}</div>
              </div>
            </div>
            <button className="footer-signout" title="Sign out" onClick={() => setShowLogoutConfirm(true)}>
              <Send size={16} />
            </button>
          </div>
        </nav>

        {/* ==================== Content Area ==================== */}
        <main className="settings-content">
          <div className="content-header">
            <h1 className="content-title">
              {categories.find((c) => c.key === category)?.label}
            </h1>
            <p className="content-desc">
              Update your {category === "account" ? "profile" : category === "appearance" ? "theme" : category === "privacy" ? "privacy" : category === "notifications" ? "notifications" : category === "chat" ? "chat" : category === "storage" ? "storage" : "help"} settings.
            </p>
          </div>

          <div className="content-body">
            {category === "account" && <AccountSection profile={profile} onChange={handleInput} onSave={saveAccount} onChangePassword={openChangePasswordModal} />}
            {category === "appearance" && <AppearanceSection appearance={appearance} onChange={setAppearance} onSettingsChange={onSettingsChange} accentColors={ACCENT_COLORS} />}
            {category === "privacy" && <PrivacySection privacy={privacy} onChange={setPrivacy} toggle={togglePrivacy} onSettingsChange={onSettingsChange} />}
            {category === "notifications" && <NotificationSection notifications={notifications} onChange={setNotifications} toggle={toggleNotification} />}
            {category === "chat" && <ChatPrefsSection prefs={chatPrefs} onChange={setChatPrefs} toggle={toggleChatPref} />}
            {category === "storage" && <StorageSection />}
            {category === "help" && <HelpSection />}
          </div>

          <div className="content-footer">
            {category === "account" && (
              <button className="btn btn-primary" onClick={saveAccount} disabled={!profile.displayName.trim()}>
                Save changes
              </button>
            )}
          </div>
        </main>

        {showLogoutConfirm && (
          <div className="logout-confirm-modal">
            <div className="logout-confirm-card">
              <h3>Sign out of CHATZO?</h3>
              <p>You will be logged out and redirected to the login page.</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-outline" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={onLogout}>Sign out</button>
              </div>
            </div>
          </div>
        )}

        {showChangePasswordModal && (
          <div className="auth-modal">
            <div className="auth-modal-card">
              <button className="auth-modal-close" onClick={() => setShowChangePasswordModal(false)}>&times;</button>
              <h3>Change Password</h3>
              <form onSubmit={handleChangePassword}>
                {cpSuccess && (
                  <div className="auth-modal-success">{cpSuccess}</div>
                )}
                {!cpSuccess && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Current Password</label>
                      <div className="auth-input password-input">
                        <Lock size={18} />
                        <input
                          type={cpShowCurrent ? "text" : "password"}
                          value={cpCurrentPassword}
                          onChange={(e) => setCpCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => toggleCpVisibility("current")}
                          aria-label={cpShowCurrent ? "Hide password" : "Show password"}
                        >
                          {cpShowCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <div className="auth-input password-input">
                        <Lock size={18} />
                        <input
                          type={cpShowNew ? "text" : "password"}
                          value={cpNewPassword}
                          onChange={(e) => setCpNewPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => toggleCpVisibility("new")}
                          aria-label={cpShowNew ? "Hide password" : "Show password"}
                        >
                          {cpShowNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="form-hint">At least 6 characters.</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <div className="auth-input password-input">
                        <Lock size={18} />
                        <input
                          type={cpShowConfirm ? "text" : "password"}
                          value={cpConfirmPassword}
                          onChange={(e) => setCpConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => toggleCpVisibility("confirm")}
                          aria-label={cpShowConfirm ? "Hide password" : "Show password"}
                        >
                          {cpShowConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    {cpError && <div className="auth-error">{cpError}</div>}
                    <button type="submit" className="btn btn-primary" disabled={cpLoading} style={{ width: "100%", marginTop: 8 }}>
                      {cpLoading ? "Changing..." : "Change Password"}
                    </button>
                    <div className="form-footer">
                      <p>Forgot your password?</p>
                      <button type="button" className="forgot-link" onClick={openForgotPasswordModal}>Reset via email</button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        )}

        {showForgotPasswordModal && (
          <div className="auth-modal">
            <div className="auth-modal-card">
              <button className="auth-modal-close" onClick={() => setShowForgotPasswordModal(false)}>&times;</button>
              <h3>Forgot Password</h3>
              <form onSubmit={handleForgotPassword}>
                {fpSuccess && (
                  <div className="auth-modal-success">{fpSuccess}</div>
                )}
                {!fpSuccess && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <div className="auth-input">
                        <Mail size={18} />
                        <input
                          type="email"
                          value={fpEmail}
                          onChange={(e) => setFpEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>
                    {fpError && <div className="auth-error">{fpError}</div>}
                    <button type="submit" className="btn btn-primary" disabled={fpLoading} style={{ width: "100%", marginTop: 8 }}>
                      {fpLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        )}

        {showResetPasswordModal && (
          <div className="auth-modal">
            <div className="auth-modal-card">
              <button className="auth-modal-close" onClick={() => setShowResetPasswordModal(false)}>&times;</button>
              <h3>Reset Password</h3>
              <form onSubmit={handleResetPassword}>
                {rpSuccess && (
                  <div className="auth-modal-success">{rpSuccess}</div>
                )}
                {!rpSuccess && (
                  <>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <div className="auth-input password-input">
                        <Lock size={18} />
                        <input
                          type={rpShowNew ? "text" : "password"}
                          value={rpNewPassword}
                          onChange={(e) => setRpNewPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => toggleRpVisibility("new")}
                          aria-label={rpShowNew ? "Hide password" : "Show password"}
                        >
                          {rpShowNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="form-hint">At least 6 characters.</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <div className="auth-input password-input">
                        <Lock size={18} />
                        <input
                          type={rpShowConfirm ? "text" : "password"}
                          value={rpConfirmPassword}
                          onChange={(e) => setRpConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => toggleRpVisibility("confirm")}
                          aria-label={rpShowConfirm ? "Hide password" : "Show password"}
                        >
                          {rpShowConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    {rpError && <div className="auth-error">{rpError}</div>}
                    <button type="submit" className="btn btn-primary" disabled={rpLoading} style={{ width: "100%", marginTop: 8 }}>
                      {rpLoading ? "Resetting..." : "Reset Password"}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Account & Profile Section                                         */
/* ------------------------------------------------------------------ */
function AccountSection({ profile, onChange, onSave, onChangePassword }) {
  return (
    <section className="settings-section">
      <div className="section-card">
        <div className="card-header">
          <h2>Account &amp; Profile</h2>
          <p>Update your personal account information.</p>
        </div>

        <div className="form-grid">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Display name</label>
              <div className="input-wrap">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => onChange("displayName", e.target.value)}
                  placeholder="Your display name"
                  required
                />
              </div>
              <p className="form-hint">Shown to other users in rooms and chats.</p>
            </div>

            <div className="form-group">
              <label className="form-label">Profile picture</label>
              <div className="avatar-picker">
                <div className="avatar-preview">{profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" />
                ) : (
                  profile.displayName.charAt(0).toUpperCase()
                )}</div>
                <label className="btn btn-outline" style={{ fontSize: "12px", padding: "6px 14px" }}>
                  Change photo
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      onChange("avatar", url);
                    }
                  }} />
                </label>
              </div>
              <p className="form-hint">Optional profile picture.</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div className="input-wrap">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => onChange("email", e.target.value)}
                  placeholder="you@example.com"
                  readOnly
                />
              </div>
              <p className="form-hint">Email cannot be changed from here.</p>
            </div>

            <div className="form-group">
              <label className="form-label">Phone number</label>
              <div className="input-wrap">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => onChange("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <p className="form-hint">Used for account recovery.</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label className="form-label">Account information</label>
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Member since</span>
                  <span className="info-value">Just now</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Account ID</span>
                  <span className="info-value">chatzo_user</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="card-header">
            <h2>Change password</h2>
            <p>Update your account password securely.</p>
          </div>
          <div className="form-stack">
            <button className="btn btn-primary" onClick={onChangePassword} style={{ width: "100%" }}>
              Change Password
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Appearance & Themes Section                                       */
/* ------------------------------------------------------------------ */
function AppearanceSection({ appearance, onChange, onSettingsChange, accentColors }) {
  return (
    <section className="settings-section">
      <div className="section-card">
        <div className="card-header">
          <h2>Appearance &amp; Themes</h2>
          <p>Customize how CHATZO looks.</p>
        </div>

        {/* Theme mode */}
        <div className="form-group">
          <label className="form-label">Theme mode</label>
          <div className="theme-picker">
            {THEMES.map((t) => {
              const isActive = appearance.theme === t.key;
              return (
                <button
                  key={t.key}
                  className={`theme-option ${isActive ? "active" : ""}`}
                  onClick={() => {
                    const next = { ...appearance, theme: t.key };
                    onChange(next);
                    if (onSettingsChange) onSettingsChange("appearance", next);
                  }}
                  title={t.label}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent color */}
        <div className="form-group">
          <label className="form-label">Accent color</label>
          <div className="color-picker">
            {accentColors.map((c) => {
              const isActive = appearance.accentColor === c.key;
              return (
                <button
                  key={c.key}
                  className={`color-chip ${isActive ? "active" : ""}`}
                  onClick={() => {
                    const next = { ...appearance, accentColor: c.key, customAccent: c.value };
                    onChange(next);
                    if (onSettingsChange) onSettingsChange("appearance", next);
                  }}
                  title={c.label}
                  style={{ backgroundColor: c.value }}
                >
                  {isActive ? <CheckMark size={14} color="white" /> : null}
                </button>
              );
            })}
            <button
              className={`color-chip custom ${appearance.accentColor === "custom" ? "active" : ""}`}
              onClick={() => {
                const next = { ...appearance, accentColor: "custom" };
                onChange(next);
                if (onSettingsChange) onSettingsChange("appearance", next);
              }}
              title="Custom color"
              style={{ backgroundColor: appearance.customAccent }}
            >
              <input
                type="color"
                value={appearance.customAccent}
                onChange={(e) => {
                  const next = { ...appearance, customAccent: e.target.value, accentColor: "custom" };
                  onChange(next);
                  if (onSettingsChange) onSettingsChange("appearance", next);
                }}
                className="sr-only color-input"
              />
              {appearance.accentColor === "custom" ? <CheckMark size={14} color="white" /> : null}
            </button>
          </div>
          <p className="form-hint">The CHATZO brand stays recognizable across themes.</p>
        </div>

        {/* Chat bubble style */}
        <div className="form-group">
          <label className="form-label">Message bubble style</label>
          <div className="bubble-picker">
            {BUBBLE_STYLES.map((b) => {
              const isActive = appearance.bubbleStyle === b.key;
              return (
                <button
                  key={b.key}
                  className={`bubble-option ${isActive ? "active" : ""}`}
                  onClick={() => onChange({ ...appearance, bubbleStyle: b.key })}
                >
                  <div className={`bubble-preview ${b.key}`} />
                  <span>{b.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar appearance */}
        <div className="form-group">
          <label className="form-label">Sidebar appearance</label>
          <select
            value={appearance.sidebar}
            onChange={(e) => {
              const next = { ...appearance, sidebar: e.target.value };
              onChange(next);
              if (onSettingsChange) onSettingsChange("appearance", next);
            }}
            className="form-select"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        {/* Chat background */}
        <div className="form-group">
          <label className="form-label">Chat background</label>
          <div className="input-wrap">
            <input
              type="color"
              value={appearance.chatBg}
              onChange={(e) => onChange({ ...appearance, chatBg: e.target.value })}
              className="bg-color-input"
            />
          </div>
        </div>

        {/* Font size */}
        <div className="form-group">
          <label className="form-label">Font size</label>
          <div className="font-picker">
            {FONT_SIZES.map((f) => {
              const isActive = appearance.fontSize === f.key;
              return (
                <button
                  key={f.key}
                  className={`font-option ${isActive ? "active" : ""}`}
                  onClick={() => onChange({ ...appearance, fontSize: f.key })}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Privacy & Security Section                                        */
/* ------------------------------------------------------------------ */
function PrivacySection({ privacy, onChange, toggle, onSettingsChange }) {
  return (
    <section className="settings-section">
      <div className="section-card">
        <div className="card-header">
          <h2>Privacy &amp; Security</h2>
          <p>Control who can see your status and profile.</p>
        </div>

        <div className="toggle-list">
          <ToggleItem
            label="Online status visibility"
            desc="Let others see when you're online"
            value={privacy.onlineStatus}
            onToggle={() => toggle("onlineStatus")}
            icon={<Eye size={16} />}
          />
          <ToggleItem
            label="Last seen visibility"
            desc="Show your last seen timestamp to others"
            value={privacy.lastSeen}
            onToggle={() => toggle("lastSeen")}
            icon={<Clock size={16} />}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Profile visibility</label>
          <select
            value={privacy.profileVisibility}
            onChange={(e) => {
              const next = { ...privacy, profileVisibility: e.target.value };
              onChange(next);
              if (onSettingsChange) onSettingsChange("privacy", next);
            }}
            className="form-select"
          >
            <option value="everyone">Everyone</option>
            <option value="contacts">My contacts</option>
            <option value="nobody">Nobody</option>
          </select>
          <p className="form-hint">Controls who can view your profile details.</p>
        </div>

        <div className="form-group">
          <label className="form-label">Blocked users</label>
          <div className="blocked-list">
            {privacy.blockedUsers.length === 0 ? (
              <p className="empty-state">No blocked users.</p>
            ) : (
              privacy.blockedUsers.map((u, i) => (
                <div className="blocked-item" key={i}>
                  <span>{u}</span>
                  <button className="btn btn-outline small" onClick={() => onChange({ ...privacy, blockedUsers: privacy.blockedUsers.filter((_, j) => j !== i) })}>
                    Unblock
                  </button>
                </div>
              ))
            )}
            <p className="form-hint">Blocking functionality is managed through your contacts.</p>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="card-header">
          <h2>Account security</h2>
          <p>Security information for your account.</p>
        </div>
        <div className="info-list">
          <div className="info-item">
            <span className="info-label">Password</span>
            <span className="info-value">Stored securely (hashed)</span>
          </div>
          <div className="info-item">
            <span className="info-label">Authentication</span>
            <span className="info-value">JWT session</span>
          </div>
          <div className="info-item">
            <span className="info-label">Active sessions</span>
            <span className="info-value coming-soon">Coming soon</span>
          </div>
        </div>
        <p className="form-hint coming-soon">Session tracking is not yet implemented.</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Notifications Section                                             */
/* ------------------------------------------------------------------ */
function NotificationSection({ notifications, onChange, toggle }) {
  return (
    <section className="settings-section">
      <div className="section-card">
        <div className="card-header">
          <h2>Notifications</h2>
          <p>Manage how you receive alerts.</p>
        </div>

        <div className="toggle-list">
          <ToggleItem
            label="Message notifications"
            desc="Get notified when you receive a new message"
            value={notifications.messages}
            onToggle={() => toggle("messages")}
            icon={<Bell size={16} />}
          />
          <ToggleItem
            label="Sound notifications"
            desc="Play a sound for incoming messages"
            value={notifications.sound}
            onToggle={() => toggle("sound")}
            icon={<Volume2 size={16} />}
          />
          <ToggleItem
            label="Room notifications"
            desc="Get notified about room activity"
            value={notifications.rooms}
            onToggle={() => toggle("rooms")}
            icon={<Send size={16} />}
          />
          <ToggleItem
            label="Notification previews"
            desc="Show message content in notifications"
            value={notifications.previews}
            onToggle={() => toggle("previews")}
            icon={<Eye size={16} />}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Muted conversations</label>
          <div className="muted-list">
            {notifications.muted.length === 0 ? (
              <p className="empty-state">No muted conversations.</p>
            ) : (
              notifications.muted.map((room, i) => (
                <div className="muted-item" key={i}>
                  <span>{room}</span>
                  <button className="btn btn-outline small" onClick={() => onChange({ ...notifications, muted: notifications.muted.filter((_, j) => j !== i) })}>
                    Unmute
                  </button>
                </div>
              ))
            )}
            <p className="form-hint">Muted conversations won't send notifications.</p>
          </div>
        </div>

        <p className="form-hint browser-perm">Browser notification permission will be requested when you enable notifications.</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat Preferences Section                                          */
/* ------------------------------------------------------------------ */
function ChatPrefsSection({ prefs, onChange, toggle }) {
  return (
    <section className="settings-section">
      <div className="section-card">
        <div className="card-header">
          <h2>Chat Preferences</h2>
          <p>Customize your messaging behavior.</p>
        </div>

        <div className="toggle-list">
          <ToggleItem
            label="Enter to send"
            desc="Press Enter to send messages instantly"
            value={prefs.enterToSend}
            onToggle={() => toggle("enterToSend")}
            icon={<Send size={16} />}
          />
          <ToggleItem
            label="Show timestamps"
            desc="Display time alongside each message"
            value={prefs.showTimestamps}
            onToggle={() => toggle("showTimestamps")}
            icon={<Clock size={16} />}
          />
          <ToggleItem
            label="Message preview"
            desc="Show message preview in room list"
            value={prefs.messagePreview}
            onToggle={() => toggle("messagePreview")}
            icon={<TextCursor size={16} />}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Default chat bubble appearance</label>
          <p className="form-hint">Controlled in Appearance &amp; Themes &rarr; Message bubble style.</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Storage & Data Section (Coming Soon placeholders)                 */
/* ------------------------------------------------------------------ */
function StorageSection() {
  return (
    <section className="settings-section">
      <div className="section-card">
        <div className="card-header">
          <h2>Storage &amp; Data</h2>
          <p>Manage your data and storage usage.</p>
        </div>
        <div className="coming-soon-card">
          <Database size={32} className="cs-icon" />
          <h3>Media &amp; storage</h3>
          <p>Uploaded media usage and cache management will appear here once media tracking is implemented.</p>
          <p className="cs-note">No storage statistics are tracked yet.</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Help & About Section                                              */
/* ------------------------------------------------------------------ */
function HelpSection() {
  return (
    <section className="settings-section">
      <div className="section-card">
        <div className="card-header">
          <h2>Help &amp; About</h2>
          <p>Support, legal and application information.</p>
        </div>

        <div className="help-list">
          <HelpItem label="Help center" desc="Browse guides and FAQs." icon={<FileText size={16} />} href="#" />
          <HelpItem label="Report a problem" desc="Tell us about an issue." icon={<FileCheck size={16} />} href="#" />
          <HelpItem label="Privacy policy" desc="How we handle your data." icon={<Shield size={16} />} href="#" />
          <HelpItem label="Terms and conditions" desc="Terms of service." icon={<FileText size={16} />} href="#" />
        </div>

        <div className="app-info">
          <div className="info-row">
            <span>Application</span>
            <span>CHATZO</span>
          </div>
          <div className="info-row">
            <span>Version</span>
            <span>1.0.0</span>
          </div>
          <div className="info-row">
            <span>Tagline</span>
            <span>Your people. Your conversations.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function ToggleItem({ label, desc, value, onToggle, icon }) {
  return (
    <div className="toggle-item">
      <div className="toggle-content">
        <span className="toggle-icon" aria-hidden="true">{icon}</span>
        <div className="toggle-text">
          <div className="toggle-label">{label}</div>
          <div className="toggle-desc">{desc}</div>
        </div>
      </div>
      <button className="switch" role="switch" aria-checked={value} onClick={onToggle}>
        <span className="switch-track" />
        <span className="switch-thumb" />
      </button>
    </div>
  );
}

function HelpItem({ label, desc, icon, href }) {
  return (
    <div className="help-item">
      <span className="help-icon" aria-hidden="true">{icon}</span>
      <div className="help-text">
        <div className="help-label">{label}</div>
        <div className="help-desc">{desc}</div>
      </div>
      <a href={href} className="help-link">Learn more <Send size={14} /></a>
    </div>
  );
}

function CheckMark({ size = 14, color = "#08B9DF" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
