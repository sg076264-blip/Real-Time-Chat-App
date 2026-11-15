
import React, { useState } from "react";
import {
  MessageCircle,
  Mail,
  Lock,
  User,
  ArrowRight,
} from "lucide-react";
import "./auth.css";

export default function Auth({ onLogin, onSignup }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <MessageCircle size={27} />
            <span>•••</span>
          </div>
          <h1>CHATZO</h1>
          <p>Your people. Your conversations.</p>
        </div>

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

          {mode === "login" && (
            <label>
              Password
              <div className="auth-input">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>
          )}

          {mode === "signup" && (
            <label>
              Password
              <div className="auth-input">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </label>
          )}

          {mode === "reset" && (
            <>
              <label>
                New Password
                <div className="auth-input">
                  <Lock size={18} />
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </label>

              <label>
                Confirm Password
                <div className="auth-input">
                  <Lock size={18} />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
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
  );
}
