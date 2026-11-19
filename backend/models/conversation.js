
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Sorted user IDs joined into one unique key.
    // This prevents duplicate conversations between the same two users.
    participantKey: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.pre("validate", function () {
  if (!this.participants || this.participants.length !== 2) {
    this.invalidate(
      "participants",
      "A private conversation must have exactly two participants."
    );
  }
});

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
