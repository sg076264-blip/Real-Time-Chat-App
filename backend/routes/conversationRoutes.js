
const express = require("express");
const mongoose = require("mongoose");

const Conversation = require("../models/conversation");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create or retrieve a private conversation
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    if (String(currentUserId) === String(userId)) {
      return res.status(400).json({
        message: "You cannot start a conversation with yourself",
      });
    }

    const otherUser = await User.findById(userId).select("_id name email");

    if (!otherUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const participantIds = [
      String(currentUserId),
      String(userId),
    ].sort();

    const participantKey = participantIds.join("_");

    let conversation = await Conversation.findOne({
      participantKey,
    }).populate("participants", "name email");

    if (!conversation) {
      try {
        conversation = await Conversation.create({
          participants: participantIds,
          participantKey,
        });

        conversation = await Conversation.findById(
          conversation._id
        ).populate("participants", "name email");
      } catch (error) {
        // Another request may have created the same conversation.
        if (error.code !== 11000) {
          throw error;
        }

        conversation = await Conversation.findOne({
          participantKey,
        }).populate("participants", "name email");
      }
    }

    return res.status(200).json({
      message: "Private conversation ready",
      conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error);

    return res.status(500).json({
      message: "Unable to create conversation",
    });
  }
});


// Search users to start a private conversation
router.get("/users/search", authMiddleware, async (req, res) => {
  try {
    const searchTerm = req.query.name?.trim();

    if (!searchTerm || searchTerm.length < 2) {
      return res.status(400).json({
        message: "Enter at least 2 characters to search",
      });
    }

    const users = await User.find({
      _id: { $ne: req.user.id },
      name: { $regex: searchTerm, $options: "i" },
    })
      .select("_id name avatar")
      .limit(10);

    return res.status(200).json({ users });
  } catch (error) {
    console.error("User search error:", error);

    return res.status(500).json({
      message: "Unable to search users",
    });
  }
});


// Get all private conversations of the logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const conversations = await Conversation.find({
      participants: currentUserId,
    })
      .populate("participants", "name email")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      conversations,
    });
  } catch (error) {
    console.error("Fetch conversations error:", error);

    return res.status(500).json({
      message: "Unable to fetch conversations",
    });
  }
});

module.exports = router;
