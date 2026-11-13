import React, { useMemo, useState } from "react";
import {
  Search, MessageCircle, Users, Settings, Home, Plus, MoreHorizontal,
  Paperclip, Smile, Send, Phone, Video, Info, Sun, Moon, CheckCheck,
  Image, FileText, Mic, ChevronDown, PanelLeftClose
} from "lucide-react";

const initialChats = [
  { id: 1, name: "Design Team", message: "Maya: the new mockups look great!", time: "2m", unread: 3, online: true, group: true, color: "violet", initials: "DT" },
  { id: 2, name: "Aarav Sharma", message: "That sounds like a plan 🙌", time: "12m", unread: 0, online: true, color: "blue", initials: "AS" },
  { id: 3, name: "College Friends", message: "You: shared a photo", time: "1h", unread: 2, online: false, group: true, color: "orange", initials: "CF" },
  { id: 4, name: "Priya Verma", message: "Are we still meeting tomorrow?", time: "3h", unread: 0, online: false, color: "pink", initials: "PV" },
  { id: 5, name: "Project CHATZO", message: "Kabir: pushed the latest update", time: "5h", unread: 0, online: true, group: true, color: "cyan", initials: "PC" },
  { id: 6, name: "Rohan Mehta", message: "Thanks! Catch you later.", time: "1d", unread: 0, online: false, color: "green", initials: "RM" }
];

const startingMessages = [
  { id: 1, mine: false, text: "Hey team! 👋 How's everyone doing?", time: "10:32 AM", author: "Maya" },
  { id: 2, mine: true, text: "Doing great! Just wrapped up the dashboard concepts.", time: "10:34 AM" },
  { id: 3, mine: false, text: "Nice! I've been exploring a few directions for the new chat experience.", time: "10:35 AM", author: "Alex" },
  { id: 4, mine: false, text: "The new mockups look great. Love the cyan accents!", time: "10:36 AM", author: "Maya" },
  { id: 5, mine: true, text: "Thanks! Keeping it clean, but still giving it some personality.", time: "10:38 AM", seen: true },
  { id: 6, mine: false, text: "Exactly what we need. Let's review the final screens this afternoon.", time: "10:40 AM", author: "Alex" }
];

function Avatar({ initials, color = "blue", online = false, large = false }) {
  return <div className={`avatar ${color} ${large ? "large" : ""}`}>{initials}<i className={online ? "online" : ""} /></div>;
}

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [activeNav, setActiveNav] = useState("Messages");
  const [activeChat, setActiveChat] = useState(1);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(startingMessages);
  const [showDetails, setShowDetails] = useState(false);

  const chats = useMemo(() => initialChats.filter(c => c.name.toLowerCase().includes(query.toLowerCase())), [query]);
  const selected = initialChats.find(c => c.id === activeChat) || initialChats[0];

  function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), mine: true, text: draft.trim(), time: "Now", seen: false }]);
    setDraft("");
  }

  return (
    <div className={`app ${theme}`}>
      <aside className="rail">
        <div className="brand-mark"><MessageCircle size={22} strokeWidth={2.6}/><span className="brand-dot">•••</span></div>
        <div className="rail-separator" />
        <button className={`rail-btn ${activeNav === "Home" ? "active" : ""}`} title="Home" onClick={() => setActiveNav("Home")}><Home /></button>
        <button className={`rail-btn ${activeNav === "Messages" ? "active" : ""}`} title="Messages" onClick={() => setActiveNav("Messages")}><MessageCircle /><b className="nav-dot" /></button>
        <button className={`rail-btn ${activeNav === "Contacts" ? "active" : ""}`} title="Contacts" onClick={() => setActiveNav("Contacts")}><Users /></button>
        <div className="rail-spacer" />
        <button className={`rail-btn ${activeNav === "Settings" ? "active" : ""}`} title="Settings" onClick={() => setActiveNav("Settings")}><Settings /></button>
        <button className="rail-profile"><Avatar initials="SG" color="cyan" /></button>
      </aside>

      <aside className="chat-sidebar">
        <div className="sidebar-top">
          <div><div className="eyebrow">YOUR SPACE</div><h1>Messages <span className="count-pill">8</span></h1></div>
          <button className="icon-btn new-chat" title="New chat"><Plus size={19}/></button>
        </div>
        <div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search conversations..." /><kbd>⌘ K</kbd></div>
        <div className="filter-row"><button className="filter active">All <span>8</span></button><button className="filter">Unread</button><button className="filter">Groups</button></div>
        <div className="section-label">RECENT CHATS <MoreHorizontal size={17}/></div>
        <div className="chat-list">
          {chats.map(chat => <button key={chat.id} onClick={() => {setActiveChat(chat.id); setMessages(startingMessages);}} className={`chat-item ${activeChat === chat.id ? "selected" : ""}`}>
            <Avatar initials={chat.initials} color={chat.color} online={chat.online}/>
            <div className="chat-copy"><div className="chat-name-row"><strong>{chat.name}</strong><span>{chat.time}</span></div><div className="chat-preview">{chat.message}</div></div>
            {chat.unread > 0 && <span className="unread">{chat.unread}</span>}
          </button>)}
          {chats.length === 0 && <div className="empty-search">No conversations found.</div>}
        </div>
        <div className="sidebar-footer"><div className="sync-indicator"/><span>Everything is up to date</span><span className="footer-version">CHATZO 1.0</span></div>
      </aside>

      <main className="conversation">
        <header className="conversation-header">
          <div className="contact-heading"><Avatar initials={selected.initials} color={selected.color} online={selected.online} large/><div><h2>{selected.name}</h2><p><span className={selected.online ? "status-live" : "status-offline"} />{selected.online ? "Active now" : "Last seen recently"}{selected.group && <span className="member-count"> · 12 members</span>}</p></div></div>
          <div className="header-actions"><button className="icon-btn" title="Voice call"><Phone/></button><button className="icon-btn" title="Video call"><Video/></button><span className="action-divider"/><button className={`icon-btn ${showDetails ? "pressed" : ""}`} title="Conversation info" onClick={() => setShowDetails(!showDetails)}><Info/></button><button className="icon-btn theme-toggle" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun/> : <Moon/>}</button></div>
        </header>
        <div className="date-divider"><span/> <p>TODAY, NOVEMBER 12</p> <span/></div>
        <section className="messages-area">
          <div className="message-intro"><div className="intro-icon"><MessageCircle size={20}/></div><strong>You're all caught up!</strong><p>This is the beginning of your conversation history.</p></div>
          {messages.map((msg, index) => <div key={msg.id} className={`message-row ${msg.mine ? "mine" : ""}`}>
            {!msg.mine && <Avatar initials={msg.author === "Maya" ? "MC" : "AJ"} color={msg.author === "Maya" ? "pink" : "green"}/>}
            <div className="message-content">{!msg.mine && <span className="message-author">{msg.author}</span>}<div className="bubble">{msg.text}</div><div className="message-meta"><span>{msg.time}</span>{msg.mine && msg.seen && <CheckCheck size={14} className="read-check"/>}</div></div>
          </div>)}
          <div className="typing-row"><div className="typing-avatar">MC</div><div className="typing-bubble"><i/><i/><i/></div><span>Maya is typing</span></div>
        </section>
        <form className="composer-wrap" onSubmit={sendMessage}>
          <div className="composer">
            <button type="button" className="composer-tool" title="Attach file"><Paperclip/></button>
            <button type="button" className="composer-tool" title="Add image"><Image/></button>
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Message ${selected.name}...`} />
            <button type="button" className="composer-tool emoji" title="Emoji"><Smile/></button>
            <button type="submit" className="send-btn" disabled={!draft.trim()}><Send size={17}/></button>
          </div>
          <div className="composer-hint"><span><kbd>↵</kbd> to send</span><span><kbd>⇧ ↵</kbd> for new line</span></div>
        </form>
      </main>

      {showDetails && <aside className="details-panel"><div className="details-head"><strong>Conversation info</strong><button className="icon-btn" onClick={() => setShowDetails(false)}>×</button></div><div className="details-person"><Avatar initials={selected.initials} color={selected.color} large/><h3>{selected.name}</h3><p>{selected.group ? "Group conversation" : "Direct message"}</p></div><div className="details-block"><span>ABOUT</span><p>A space to share updates, ideas, and everyday conversations.</p></div><div className="details-block"><span>SHARED MEDIA</span><div className="media-placeholder"><Image/>No shared media yet</div></div></aside>}
    </div>
  );
}
