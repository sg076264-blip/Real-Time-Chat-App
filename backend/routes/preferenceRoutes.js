const protect = require("../middleware/authMiddleware");
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();

// Default preferences shape used when a user has no stored preferences.
const DEFAULT_PREFERENCES = {
  theme: "dark",
  accentColor: "cyan",
  customAccent: "#08B9DF",
  bubbleStyle: "rounded",
  chatBg: "#020D28",
  sidebar: "dark",
  fontSize: "md",
  onlineStatus: true,
  lastSeen: true,
  profileVisibility: "everyone",
  blockedUsers: [],
  notifications: {
    messages: true,
    sound: true,
    rooms: true,
    previews: true,
  },
  muted: [],
  chatPrefs: {
    enterToSend: true,
    showTimestamps: true,
    messagePreview: true,
  },
};

// GET /api/auth/preferences — load the authenticated user's preferences
router.get("/preferences", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("preferences name email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const preferences = user.preferences || DEFAULT_PREFERENCES;

    return res.status(200).json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error("Get preferences error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching preferences",
    });
  }
});

// PUT /api/auth/preferences — save/update the authenticated user's preferences
router.put("/preferences", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({
        success: false,
        message: "Preferences object is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Merge provided preferences with defaults so missing keys are preserved.
    const mergedPreferences = {
      ...DEFAULT_PREFERENCES,
      ...preferences,
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...(preferences.notifications || {}),
      },
      chatPrefs: {
        ...DEFAULT_PREFERENCES.chatPrefs,
        ...(preferences.chatPrefs || {}),
      },
    };

    user.preferences = mergedPreferences;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Preferences saved successfully",
      preferences: mergedPreferences,
    });
  } catch (error) {
    console.error("Save preferences error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while saving preferences",
    });
  }
});

// PUT /api/auth/profile — update the authenticated user's profile (name, phone, avatar)
router.put("/profile", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, avatar } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate and sanitize inputs
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Display name cannot be empty",
        });
      }
      if (trimmedName.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Display name must be 50 characters or fewer",
        });
      }
      user.name = trimmedName;
    }

    if (phone !== undefined) {
      user.phone = String(phone).trim() || "";
    }

    if (avatar !== undefined) {
      user.avatar = String(avatar).trim() || "";
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
});

// PUT /api/auth/change-password — change the authenticated user's password
router.put("/change-password", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 6 characters",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while changing password",
    });
  }
});

// POST /api/auth/forgot-password — request a password reset token
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Always return success to avoid email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account exists for this email, a reset link has been generated.",
      });
    }

    // Generate a secure, time-limited, single-use reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    // In production, send this token via email. No SMTP is configured,
    // so the token is logged to the console in development for testing.
    console.log(
      `[PASSWORD RESET] Token for ${user.email}: ${resetToken} (expires at ${resetExpires.toISOString()})`
    );

    return res.status(200).json({
      success: true,
      message: "If an account exists for this email, a reset link has been generated.",
      // Only expose token in non-production for testing; remove in production
      ...(process.env.NODE_ENV !== "production" ? { resetToken } : {}),
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while processing password reset request",
    });
  }
});

// POST /api/auth/reset-password — reset password using a valid token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 6 characters",
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = "";
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while resetting password",
    });
  }
});

module.exports = router;
