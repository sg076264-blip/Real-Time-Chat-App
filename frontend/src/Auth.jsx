import React, { useState } from "react";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import Logo from "./components/Logo";
import "./auth.css";

export default function Auth({ onLogin, onSignup }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || (mode !== "reset" && !password)) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        await onSignup({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        });

        setSuccess("Account created! You can now log in.");
        setMode("login");
        setPassword("");
      } else {
        await onLogin({
          email: email.trim().toLowerCase(),
          password,
        });
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5001/api/auth/dev-reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password reset failed.");
      }

      setSuccess("Password reset successfully! You can now log in.");
      setNewPassword("");
      setConfirmPassword("");
      setPassword("");
      setMode("login");
    } catch (err) {
      setError(err.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  }

  function togglePassword(field) {
    if (field === "password") setShowPassword((prev) => !prev);
    if (field === "newPassword") setShowNewPassword((prev) => !prev);
    if (field === "confirmPassword") setShowConfirmPassword((prev) => !prev);
  }

  return (
    <div className="auth-page">
      <div className="auth-wrap">
        {/* =========================================================
             LEFT — BRAND PANEL
             ========================================================= */}
        <div className="auth-brand">
          <div className="brand-content">
            <Logo size={48} className="brand-logo" />
            <h1 className="brand-name">CHATZO</h1>
            <p className="brand-tagline">Your people. Your conversations.</p>
            <div className="brand-divider" />

            <h2 className="brand-headline">
              Conversations that bring people closer.
            </h2>
            <p className="brand-desc">
              Your space to connect, collaborate and share moments with the
              people who matter.
            </p>

            <div className="brand-quote">
              <q>
                More than just messages. A space to connect, share and belong.
              </q>
            </div>

            <div className="brand-graphics">
              <div className="bubble bubble-1" aria-hidden="true" />
              <div className="bubble bubble-2" aria-hidden="true" />
              <div className="bubble bubble-3" aria-hidden="true" />
              <div className="card card-1" aria-hidden="true" />
              <div className="card card-2" aria-hidden="true" />
              <div className="dot dot-small" aria-hidden="true" />
              <div className="dot dot-medium" aria-hidden="true" />
              <div className="dot dot-large" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* =========================================================
             RIGHT — AUTHENTICATION PANEL
             ========================================================= */}
        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="auth-heading">
              <h2>
                {mode === "login"
                  ? "Welcome back"
                  : mode === "signup"
                  ? "Create your account"
                  : "Reset your password"}
              </h2>
              <p>
                {mode === "login"
                  ? "Sign in to continue your conversations."
                  : mode === "signup"
                  ? "Join CHATZO and connect with your people."
                  : "Enter your email and choose a new password."}
              </p>
            </div>

            <form
              className="auth-form"
              onSubmit={
                mode === "reset"
                  ? handlePasswordReset
                  : handleSubmit
              }
            >
              {mode === "signup" && (
                <label>
                  Full name
                  <div className="auth-input">
                    <User size={18} />
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>
                </label>
              )}

              <label>
                Email address
                <div className="auth-input">
                  <Mail size={18} />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              {(mode === "login" || mode === "signup") && (
                <label>
                  Password
                  <div className="auth-input password-input">
                    <Lock size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePassword("password")}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              )}

              {mode === "signup" && (
                <label>
                  Confirm password
                  <div className="auth-input password-input">
                    <Lock size={18} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePassword("confirmPassword")}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              )}

              {mode === "reset" && (
                <>
                  <label>
                    New Password
                    <div className="auth-input password-input">
                      <Lock size={18} />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => togglePassword("newPassword")}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>

                  <label>
                    Confirm Password
                    <div className="auth-input password-input">
                      <Lock size={18} />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => togglePassword("confirmPassword")}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                </>
              )}

              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

              {success && (
                <div className="auth-success" role="status">
                  {success}
                </div>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                  ? "Create account"
                  : "Reset Password"}

                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            {mode === "login" && (
              <div className="forgot-password">
                <button
                  type="button"
                  onClick={() => changeMode("reset")}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {mode === "reset" && (
              <div className="auth-switch">
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                >
                  Back to Login
                </button>
              </div>
            )}

            {mode !== "reset" && (
              <div className="auth-switch">
                {mode === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => changeMode("signup")}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => changeMode("login")}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="auth-bottom">
              SECURELY CONNECTED WITH CHATZO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
