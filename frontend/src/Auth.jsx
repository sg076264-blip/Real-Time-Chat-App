
import React, { useState } from "react";
import { MessageCircle, Mail, Lock, User, ArrowRight } from "lucide-react";
import "./auth.css";

export default function Auth({ onLogin, onSignup }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Please fill in all required fields.");
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

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
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
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p>
            {mode === "login"
              ? "Sign in to continue your conversations."
              : "Join CHATZO and connect with your people."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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
              />
            </div>
          </label>

          <label>
            Password
            <div className="auth-input">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
          </label>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button type="button" onClick={() => changeMode("signup")}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => changeMode("login")}>
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="auth-bottom">SECURELY CONNECTED WITH CHATZO</div>
      </div>
    </div>
  );
}
