const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    avatar: {
      type: String,
      default: ""
    },

    phone: {
      type: String,
      default: ""
    },

    preferences: {
      type: Object,
      default: {
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
      }
    },

    resetPasswordToken: {
      type: String,
      default: ""
    },

    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;