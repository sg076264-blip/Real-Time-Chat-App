import React from "react";

/**
 * CHATZO brand logo.
 *
 * A reusable SVG built from the original brand identity:
 * a bright cyan stylized letter "C" combined with a chat bubble.
 *
 * Props:
 * - size:   display size in px (default 32)
 * - className: extra CSS classes
 * - color:  accent/cyan color override (default #08B9DF)
 */
export default function Logo({ size = 32, className = "", color = "#08B9DF" }) {
  const darker = color === "#08B9DF" ? "#059AB8" : color;

  return (
    <svg
      className={`chatzo-logo ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="CHATZO logo"
    >
      <defs>
        <linearGradient id="chatzo-cyan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={darker} />
        </linearGradient>
      </defs>

      {/* Chat bubble body (rounded rectangle) */}
      <rect
        x="8"
        y="14"
        width="46"
        height="40"
        rx="13"
        fill="url(#chatzo-cyan-gradient)"
      />

      {/* Chat bubble tail */}
      <path
        d="M30 54 L44 54 L46 62 L28 54 Z"
        fill="url(#chatzo-cyan-gradient)"
      />

      {/* Stylized letter "C" layered on the bubble */}
      <path
        d="M16 24 C16 24 16 40 26 40 C30 40 30 24 30 24 L34 24 C38 24 40 26 40 28 C40 40 32 46 26 46 C20 46 16 40 16 40 Z"
        fill="white"
        fillOpacity={0.92}
      />
    </svg>
  );
}
