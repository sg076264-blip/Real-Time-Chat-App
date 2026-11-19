
const { io } = require("socket.io-client");

// Keep these tokens private. Add them only in your local file.
const token1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZjg3NmMyZDczYTA1ZGY2ZTRmMjNmZiIsImlhdCI6MTc5NTExMzcyMywiZXhwIjoxNzk1MjAwMTIzfQ.VenXey7tpBqH4woHvsYRrjmSYA_xW-OghQ85TbZ0HsY";
const token2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZjcyNGI5OWUwOTRlOTY0NDI4YmYxMCIsImlhdCI6MTc5NTExMzc2MSwiZXhwIjoxNzk1MjAwMTYxfQ.-Tr1sebJ8Oz2U1Ril93q4yVDoY42eHxm-1BzHTuNiy4";

// Get this ID from your Postman conversation response.
const conversationId = "6aff436127ab5f4400e3e46c";

const user1 = io("http://localhost:5001", {
  auth: { token: token1 },
});

const user2 = io("http://localhost:5001", {
  auth: { token: token2 },
});

let joinedUsers = 0;
let messageSent = false;

function setupUser(socket, name, shouldSendMessage) {
  socket.on("connect", () => {
    console.log(`${name} connected:`, socket.id);

    socket.emit("joinPrivateConversation", conversationId);
  });

  socket.on("connect_error", (error) => {
    console.log(`${name} connection error:`, error.message);
  });

  socket.on("privateConversationJoined", (data) => {
    console.log(`${name} joined:`, data.message);

    joinedUsers++;

    socket.emit("getPrivateMessageHistory", conversationId);

    // Send one test message after both users have joined.
    if (joinedUsers === 2 && !messageSent) {
      messageSent = true;

      console.log("User 1 sending private message...");

      user1.emit("sendPrivateMessage", {
        conversationId,
        text: "Hello! This is a private test message.",
      });
    }
  });

  socket.on("privateMessageHistory", (data) => {
    console.log(`${name} message history:`, data.messages);
  });

  socket.on("newPrivateMessage", (message) => {
    console.log(`${name} received private message:`, message);
  });

  socket.on("privateMessageError", (error) => {
    console.log(`${name} private chat error:`, error.message);
  });
}

setupUser(user1, "User 1", true);
setupUser(user2, "User 2", false);

// Keep the test running until you press Enter.
process.stdin.resume();

process.stdin.once("data", () => {
  user1.disconnect();
  user2.disconnect();
  console.log("Both users disconnected.");
  process.exit(0);
});
