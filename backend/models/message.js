
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },

    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// A message must belong to either a group room or a private conversation,
// never both.
messageSchema.pre("validate", function () {
  const hasRoom = Boolean(this.room);
  const hasConversation = Boolean(this.conversation);

  if (hasRoom === hasConversation) {
    this.invalidate(
      "room",
      "A message must belong to exactly one room or conversation."
    );
  }
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
