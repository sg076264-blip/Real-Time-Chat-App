const express = require("express");
const Room = require("../models/Room");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create Room API
router.post("/", protect, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check room name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Room name is required"
      });
    }

    // Create new room
    const newRoom = await Room.create({
      name: name.trim(),
      description: description || "",
      createdBy: req.user.id,
      members: [req.user.id]
    });

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: newRoom
    });

  } catch (error) {
    console.error("Create room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while creating room"
    });
  }
});

// Get All Rooms with Pagination
router.get("/", protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const skip = (page - 1) * limit;

    const rooms = await Room.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalRooms = await Room.countDocuments();

    res.status(200).json({
      success: true,
      totalRooms,
      currentPage: page,
      totalPages: Math.ceil(totalRooms / limit),
      rooms
    });

  } catch (error) {
    console.error("Get rooms error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while fetching rooms"
    });
  }
});


// Search Rooms API
router.get("/search", protect, async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search keyword is required"
      });
    }

    const rooms = await Room.find({
      name: {
        $regex: name.trim(),
        $options: "i"
      }
    }).populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms
    });

  } catch (error) {
    console.error("Search rooms error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while searching rooms"
    });
  }
});

// Get Single Room API
router.get("/:id", protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("createdBy", "name email");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    res.status(200).json({
      success: true,
      room
    });

  } catch (error) {
    console.error("Get single room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while fetching room"
    });
  }
});

// Update Room API
router.put("/:id", protect, async (req, res) => {
  try {
    const { name, description } = req.body;

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check room creator
    if (room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this room"
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Room name cannot be empty"
        });
      }

      room.name = name.trim();
    }

    if (description !== undefined) {
      room.description = description;
    }

    await room.save();

    res.status(200).json({
      success: true,
      message: "Room updated successfully",
      room
    });

  } catch (error) {
    console.error("Update room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while updating room"
    });
  }
});

// Delete Room API
router.delete("/:id", protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check room creator
    if (room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this room"
      });
    }

    await room.deleteOne();

    res.status(200).json({
      success: true,
      message: "Room deleted successfully"
    });

  } catch (error) {
    console.error("Delete room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while deleting room"
    });
  }
});


// Join Room API
router.post("/:id/join", protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check if user is already a member
    if (room.members.some(
      memberId => memberId.toString() === req.user.id
    )) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this room"
      });
    }

    room.members.push(req.user.id);

    await room.save();

    res.status(200).json({
      success: true,
      message: "Joined room successfully",
      room
    });

  } catch (error) {
    console.error("Join room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while joining room"
    });
  }
});

// Leave Room API
router.post("/:id/leave", protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Room creator cannot leave their own room
    if (room.createdBy.toString() === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Room creator cannot leave the room"
      });
    }

    // Check membership
    const isMember = room.members.some(
      memberId => memberId.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "You are not a member of this room"
      });
    }

    // Remove user from members array
    room.members = room.members.filter(
      memberId => memberId.toString() !== req.user.id
    );

    await room.save();

    res.status(200).json({
      success: true,
      message: "Left room successfully"
    });

  } catch (error) {
    console.error("Leave room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while leaving room"
    });
  }
});

// Get Room Members API
router.get("/:id/members", protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("members", "name email");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    res.status(200).json({
      success: true,
      count: room.members.length,
      members: room.members
    });

  } catch (error) {
    console.error("Get members error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while fetching members"
    });
  }
});

module.exports = router;