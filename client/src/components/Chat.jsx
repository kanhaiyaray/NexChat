import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { useUser, SignIn, SignOutButton } from "@clerk/clerk-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:1000";
const API_BASE   = SOCKET_URL;

const socket = io(SOCKET_URL);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseToken(input = "") {
  input = input.trim();
  try {
    const url   = new URL(input);
    const param = url.searchParams.get("token");
    if (param) return param;
  } catch {}
  return input;
}

function shortRoomId(roomId = "") {
  return roomId.replace(/^room_/, "").slice(0, 8) || "private";
}

// ─── Global Styles (embedded) ────────────────────────────────────────────────
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:      #070b14;
    --surface: #0d1320;
    --panel:   #111827;
    --border:  rgba(99,210,255,0.12);
    --cyan:    #3dd6f5;
    --violet:  #a78bfa;
    --rose:    #f472b6;
    --green:   #34d399;
    --gold:    #fbbf24;
    --text:    #e2e8f0;
    --muted:   #64748b;
    --radius:  16px;
    --glow-c:  0 0 24px rgba(61,214,245,0.25);
    --glow-v:  0 0 24px rgba(167,139,250,0.25);
  }

  body { background: var(--bg); font-family: 'DM Sans', sans-serif; color: var(--text); }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

  @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes slideIn  { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
  @keyframes popIn    { 0%{opacity:0;transform:scale(.6)} 70%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
  @keyframes glow-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }

  .clerk-wrapper {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(61,214,245,.08) 0%,transparent 70%),
               radial-gradient(ellipse 50% 40% at 90% 80%,rgba(167,139,250,.07) 0%,transparent 60%),
               var(--bg);
  }

  .join-bg {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    position:relative; overflow:hidden;
    background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(61,214,245,.08) 0%,transparent 70%),
               radial-gradient(ellipse 50% 40% at 90% 80%,rgba(167,139,250,.07) 0%,transparent 60%),
               var(--bg);
  }
  .grid-bg {
    position:absolute; inset:0; pointer-events:none;
    background-image:linear-gradient(rgba(99,210,255,.04) 1px,transparent 1px),
                     linear-gradient(90deg,rgba(99,210,255,.04) 1px,transparent 1px);
    background-size:40px 40px;
    mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 80%);
  }
  .join-card {
    position:relative; width:440px;
    background:linear-gradient(135deg,rgba(13,19,32,.97) 0%,rgba(17,24,39,.97) 100%);
    border:1px solid var(--border); border-radius:24px;
    padding:48px 40px; backdrop-filter:blur(24px);
    box-shadow:0 32px 64px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);
    animation:fadeUp .5s ease both;
  }
  .join-card::before {
    content:''; position:absolute; top:0; left:50%; transform:translateX(-50%);
    width:60%; height:1px;
    background:linear-gradient(90deg,transparent,var(--cyan),transparent);
    border-radius:99px;
  }
  .brand-icon {
    width:56px; height:56px;
    background:linear-gradient(135deg,rgba(61,214,245,.15),rgba(167,139,250,.15));
    border:1px solid rgba(61,214,245,.2); border-radius:16px;
    display:flex; align-items:center; justify-content:center; font-size:24px;
    margin-bottom:24px; box-shadow:var(--glow-c);
  }
  .join-title {
    font-family:'Syne',sans-serif; font-size:28px; font-weight:800;
    background:linear-gradient(135deg,var(--cyan),var(--violet));
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    margin-bottom:6px;
  }
  .join-sub { color:var(--muted); font-size:14px; margin-bottom:28px; }

  .user-greeting {
    display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px;
    background:rgba(61,214,245,.06); border:1px solid rgba(61,214,245,.12);
    margin-bottom:24px; font-size:13px; color:var(--cyan);
  }
  .user-avatar-sm { width:28px; height:28px; border-radius:8px; object-fit:cover; }

  .create-btn {
    width:100%; padding:16px; cursor:pointer; border:none; border-radius:14px;
    background:linear-gradient(135deg,var(--cyan),var(--violet));
    color:#070b14; font-family:'Syne',sans-serif; font-size:15px; font-weight:700;
    letter-spacing:.04em; position:relative; overflow:hidden;
    box-shadow:0 8px 28px rgba(61,214,245,.3);
    transition:transform .15s, box-shadow .15s;
  }
  .create-btn::after {
    content:''; position:absolute; inset:0;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);
    background-size:200% 100%; animation:shimmer 2.5s infinite;
  }
  .create-btn:hover { transform:translateY(-2px); box-shadow:0 12px 36px rgba(61,214,245,.4); }
  .create-btn:active { transform:translateY(0); }
  .create-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }

  .divider {
    display:flex; align-items:center; gap:12px; margin:24px 0;
    font-size:11px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase;
  }
  .divider::before,.divider::after { content:''; flex:1; height:1px; background:var(--border); }

  .field-group { margin-bottom:14px; }
  .field-label { font-size:11px; font-weight:500; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; margin-bottom:8px; display:block; }
  .field-input {
    width:100%; background:rgba(255,255,255,.04); border:1px solid var(--border);
    border-radius:12px; padding:13px 16px;
    color:var(--text); font-family:'DM Sans',sans-serif; font-size:14px;
    transition:border-color .2s,box-shadow .2s,background .2s; outline:none;
  }
  .field-input::placeholder { color:var(--muted); }
  .field-input:focus {
    border-color:rgba(61,214,245,.4);
    box-shadow:0 0 0 3px rgba(61,214,245,.08);
    background:rgba(61,214,245,.04);
  }
  .join-btn {
    width:100%; margin-top:12px; padding:13px; cursor:pointer;
    background:rgba(255,255,255,.06); border:1px solid var(--border); border-radius:12px;
    color:var(--text); font-family:'Syne',sans-serif; font-size:14px; font-weight:600;
    transition:background .15s, border-color .15s;
  }
  .join-btn:hover { background:rgba(255,255,255,.1); border-color:rgba(99,210,255,.25); }
  .join-btn:disabled { opacity:.45; cursor:not-allowed; }

  .sign-out-btn {
    display:block; width:100%; margin-top:12px; padding:9px;
    background:transparent; border:1px solid var(--border); border-radius:10px;
    color:var(--muted); font-size:12px; cursor:pointer; transition:all .15s;
  }
  .sign-out-btn:hover { background:rgba(255,255,255,.05); color:var(--text); }

  .error-msg {
    margin-top:12px; padding:10px 14px; border-radius:10px;
    background:rgba(244,114,182,.08); border:1px solid rgba(244,114,182,.2);
    font-size:12px; color:var(--rose); text-align:center; animation:fadeUp .2s ease;
  }

  /* Chat Layout */
  .chat-layout {
    height:100vh; display:flex;
    background:radial-gradient(ellipse 70% 50% at 20% -20%,rgba(61,214,245,.05) 0%,transparent 60%),
               var(--bg);
  }
  .sidebar {
    width:260px; flex-shrink:0; background:var(--surface);
    border-right:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden;
  }
  .sidebar-header { padding:20px 20px 16px; border-bottom:1px solid var(--border); }
  .sidebar-logo {
    display:flex; align-items:center; gap:10px;
    font-family:'Syne',sans-serif; font-size:18px; font-weight:800;
    background:linear-gradient(135deg,var(--cyan),var(--violet));
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }
  .logo-dot { width:8px; height:8px; border-radius:50%; background:var(--cyan); box-shadow:var(--glow-c); animation:glow-pulse 2s infinite; }
  .room-badge {
    margin-top:10px; display:inline-flex; align-items:center; gap:6px;
    background:rgba(61,214,245,.08); border:1px solid rgba(61,214,245,.15);
    border-radius:8px; padding:5px 10px; font-size:12px; color:var(--cyan);
  }
  .private-badge {
    margin-top:6px; display:inline-flex; align-items:center; gap:5px;
    background:rgba(167,139,250,.08); border:1px solid rgba(167,139,250,.2);
    border-radius:6px; padding:3px 8px; font-size:11px; color:var(--violet);
  }
  .users-section { flex:1; overflow-y:auto; padding:16px; }
  .section-label { font-size:11px; font-weight:600; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; margin-bottom:12px; }
  .user-item {
    display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px;
    cursor:default; transition:background .15s; animation:slideIn .3s ease both;
  }
  .user-item:hover { background:rgba(255,255,255,.04); }
  .avatar {
    width:32px; height:32px; border-radius:10px;
    display:flex; align-items:center; justify-content:center;
    font-size:13px; font-weight:700; flex-shrink:0;
  }
  .online-ring { position:relative; flex-shrink:0; }
  .online-ring::after {
    content:''; position:absolute; bottom:-1px; right:-1px;
    width:9px; height:9px; border-radius:50%;
    background:var(--green); border:2px solid var(--surface);
  }
  .user-name { font-size:13px; font-weight:500; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .you-tag { font-size:10px; color:var(--muted); background:rgba(255,255,255,.06); border-radius:4px; padding:1px 5px; }
  .sidebar-footer { padding:16px; border-top:1px solid var(--border); }
  .my-info { display:flex; align-items:center; gap:10px; }
  .my-name { font-size:13px; font-weight:500; }
  .my-status { font-size:11px; color:var(--green); }
  .sidebar-signout {
    margin-top:10px; width:100%; padding:7px;
    background:transparent; border:1px solid var(--border); border-radius:8px;
    color:var(--muted); font-size:12px; cursor:pointer; transition:all .15s;
  }
  .sidebar-signout:hover { color:var(--rose); border-color:rgba(244,114,182,.3); background:rgba(244,114,182,.06); }

  .chat-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
  .chat-header {
    padding:16px 24px; border-bottom:1px solid var(--border);
    background:rgba(13,19,32,.8); backdrop-filter:blur(12px);
    display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
  }
  .room-name { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; color:var(--text); }
  .room-subtitle { font-size:11px; color:var(--muted); margin-top:2px; }
  .header-meta { display:flex; align-items:center; gap:10px; }
  .member-count { font-size:13px; color:var(--muted); display:flex; align-items:center; gap:6px; }
  .status-dot { width:7px; height:7px; border-radius:50%; background:var(--green); box-shadow:0 0 8px var(--green); }

  .copy-link-btn {
    display:flex; align-items:center; gap:6px; padding:7px 12px;
    background:rgba(167,139,250,.1); border:1px solid rgba(167,139,250,.25); border-radius:10px;
    color:var(--violet); font-size:12px; font-weight:500; cursor:pointer;
    transition:all .15s; white-space:nowrap;
  }
  .copy-link-btn:hover { background:rgba(167,139,250,.18); border-color:rgba(167,139,250,.4); }
  .copy-link-btn.copied { background:rgba(52,211,153,.1); border-color:rgba(52,211,153,.25); color:var(--green); }

  .history-loading {
    text-align:center; padding:24px; color:var(--muted); font-size:13px;
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .messages-area { flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:4px; }
  .msg-row { display:flex; align-items:flex-end; gap:10px; animation:fadeUp .25s ease both; }
  .msg-row.own { flex-direction:row-reverse; }
  .msg-avatar {
    width:30px; height:30px; border-radius:9px;
    display:flex; align-items:center; justify-content:center;
    font-size:12px; font-weight:700; flex-shrink:0; margin-bottom:2px;
  }
  .msg-content { max-width:68%; }
  .msg-sender { font-size:11px; color:var(--muted); margin-bottom:3px; padding:0 12px; }
  .msg-row.own .msg-sender { text-align:right; }
  .msg-bubble {
    padding:10px 14px; border-radius:16px;
    font-size:14px; line-height:1.55; word-break:break-word; position:relative;
  }
  .msg-bubble.other { background:var(--panel); border:1px solid var(--border); border-bottom-left-radius:4px; color:var(--text); }
  .msg-bubble.own {
    background:linear-gradient(135deg,rgba(61,214,245,.18),rgba(167,139,250,.18));
    border:1px solid rgba(167,139,250,.2); border-bottom-right-radius:4px; color:var(--text);
  }
  .msg-time { font-size:10px; color:var(--muted); margin-top:3px; padding:0 4px; }
  .msg-row.own .msg-time { text-align:right; }
  .msg-img { max-width:220px; border-radius:12px; cursor:pointer; transition:transform .2s; display:block; margin-top:2px; }
  .msg-img:hover { transform:scale(1.03); }
  .msg-reactions { display:flex; gap:4px; flex-wrap:wrap; margin-top:6px; }
  .reaction-chip {
    display:inline-flex; align-items:center; gap:3px;
    background:rgba(255,255,255,.07); border:1px solid var(--border);
    border-radius:99px; padding:2px 8px; font-size:13px; cursor:pointer;
    transition:background .15s, transform .1s;
  }
  .reaction-chip:hover { background:rgba(255,255,255,.12); transform:scale(1.05); }
  .reaction-chip span { font-size:11px; color:var(--muted); }
  .reaction-picker {
    position:absolute; bottom:100%; left:0;
    background:var(--panel); border:1px solid var(--border); border-radius:12px;
    padding:8px; display:flex; gap:6px; box-shadow:0 8px 24px rgba(0,0,0,.5);
    animation:popIn .2s ease; z-index:10;
  }
  .reaction-opt { font-size:18px; cursor:pointer; padding:2px; border-radius:6px; transition:transform .1s,background .1s; }
  .reaction-opt:hover { transform:scale(1.3); background:rgba(255,255,255,.1); }
  .date-divider {
    display:flex; align-items:center; gap:12px;
    color:var(--muted); font-size:11px; letter-spacing:.06em; margin:12px 0;
  }
  .date-divider::before,.date-divider::after { content:''; flex:1; height:1px; background:var(--border); }

  .typing-bar {
    height:24px; padding:0 24px; display:flex; align-items:center;
    font-size:12px; color:var(--muted); font-style:italic; flex-shrink:0;
  }
  .typing-dots { display:inline-flex; gap:3px; margin-right:6px; }
  .typing-dots span { width:4px; height:4px; border-radius:50%; background:var(--cyan); animation:blink 1s infinite; }
  .typing-dots span:nth-child(2) { animation-delay:.2s; }
  .typing-dots span:nth-child(3) { animation-delay:.4s; }
  .input-bar {
    padding:16px 24px; border-top:1px solid var(--border);
    background:rgba(13,19,32,.9); backdrop-filter:blur(12px); flex-shrink:0;
  }
  .image-preview {
    display:flex; align-items:center; gap:10px;
    background:rgba(255,255,255,.04); border:1px solid var(--border);
    border-radius:10px; padding:8px 12px; margin-bottom:10px; animation:fadeUp .2s ease;
  }
  .preview-thumb { width:48px; height:48px; object-fit:cover; border-radius:8px; }
  .preview-name { font-size:12px; color:var(--muted); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .preview-remove {
    width:24px; height:24px; border-radius:6px;
    background:rgba(244,114,182,.1); border:1px solid rgba(244,114,182,.2);
    color:var(--rose); font-size:14px; cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition:background .15s;
  }
  .preview-remove:hover { background:rgba(244,114,182,.2); }
  .input-row { display:flex; align-items:center; gap:10px; }
  .msg-input {
    flex:1; background:rgba(255,255,255,.05); border:1px solid var(--border);
    border-radius:12px; padding:12px 16px;
    color:var(--text); font-family:'DM Sans',sans-serif; font-size:14px;
    outline:none; transition:border-color .2s,box-shadow .2s; resize:none;
  }
  .msg-input::placeholder { color:var(--muted); }
  .msg-input:focus { border-color:rgba(61,214,245,.3); box-shadow:0 0 0 3px rgba(61,214,245,.06); }
  .icon-btn {
    width:42px; height:42px; border-radius:11px;
    border:1px solid var(--border); background:rgba(255,255,255,.04);
    color:var(--muted); font-size:18px; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:background .15s,color .15s,border-color .15s,transform .1s; flex-shrink:0;
  }
  .icon-btn:hover { background:rgba(255,255,255,.08); color:var(--text); border-color:rgba(255,255,255,.15); }
  .icon-btn:active { transform:scale(.93); }
  .icon-btn.accent {
    background:linear-gradient(135deg,var(--cyan),var(--violet)); border:none; color:#070b14;
    box-shadow:0 4px 16px rgba(61,214,245,.25);
  }
  .icon-btn.accent:hover { box-shadow:0 6px 20px rgba(61,214,245,.35); transform:translateY(-1px); }
  .icon-btn:disabled { opacity:.4; cursor:not-allowed; transform:none; }
  .emoji-picker {
    position:absolute; bottom:72px; right:24px;
    background:var(--panel); border:1px solid var(--border); border-radius:16px;
    padding:12px; display:flex; flex-wrap:wrap; gap:6px; width:220px;
    box-shadow:0 16px 40px rgba(0,0,0,.6); z-index:20; animation:popIn .2s ease;
  }
  .emoji-btn { font-size:20px; cursor:pointer; padding:4px; border-radius:8px; transition:transform .1s,background .1s; }
  .emoji-btn:hover { transform:scale(1.25); background:rgba(255,255,255,.08); }
  .lightbox {
    position:fixed; inset:0; background:rgba(0,0,0,.85);
    display:flex; align-items:center; justify-content:center;
    z-index:100; cursor:pointer; backdrop-filter:blur(8px); animation:fadeUp .2s ease;
  }
  .lightbox img { max-width:90vw; max-height:90vh; border-radius:12px; box-shadow:0 24px 64px rgba(0,0,0,.8); }
  .toast {
    position:fixed; bottom:32px; left:50%; transform:translateX(-50%);
    background:var(--panel); border:1px solid var(--border); border-radius:12px;
    padding:10px 20px; font-size:13px; color:var(--text);
    box-shadow:0 8px 24px rgba(0,0,0,.5); z-index:200; animation:fadeUp .3s ease;
    pointer-events:none;
  }
  .toast.error { border-color:rgba(244,114,182,.3); color:var(--rose); }
  .uploading-indicator {
    display:inline-flex; align-items:center; gap:8px; font-size:12px; color:var(--muted);
    padding:6px 12px; background:rgba(255,255,255,.04); border-radius:8px; margin-bottom:8px;
  }
  .spin-icon { animation:spin 1s linear infinite; display:inline-block; }

  /* Context menu styles */
  .context-menu {
    position: fixed;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,.5);
    z-index: 200;
    animation: popIn 0.15s ease;
  }
  .context-menu-item {
    padding: 6px 12px;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.1s;
    font-size: 13px;
    white-space: nowrap;
  }
  .context-menu-item:hover {
    background: rgba(255,255,255,0.08);
  }
  .context-menu-divider {
    height: 1px;
    background: var(--border);
    margin: 6px 0;
  }
  .reaction-row {
    display: flex;
    gap: 8px;
    padding: 4px;
  }
`;
document.head.appendChild(styleSheet);

// ─── Constants ────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ["rgba(61,214,245,.25)",  "#3dd6f5"],
  ["rgba(167,139,250,.25)", "#a78bfa"],
  ["rgba(244,114,182,.25)", "#f472b6"],
  ["rgba(52,211,153,.25)",  "#34d399"],
  ["rgba(251,191,36,.25)",  "#fbbf24"],
  ["rgba(248,113,113,.25)", "#f87171"],
];
const getAvatarStyle = (name = "") => {
  const [bg, color] = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return { background: bg, color };
};
const initials = (name = "") => name.slice(0, 2).toUpperCase();

const EMOJI_PANEL = ["😂","🔥","❤️","👍","😮","😢","🎉","💀","🤯","👀","✅","💯"];
const REACTIONS   = ["❤️","🔥","😂","👍","😮","💯"];

// ─── PrivateJoinScreen Component (unchanged) ─────────────────────────────────
const PrivateJoinScreen = ({ clerkUser, initialToken, onJoin }) => {
  const [pastedLink, setPastedLink]   = useState("");
  const [creating,   setCreating]     = useState(false);
  const [validating, setValidating]   = useState(false);
  const [errorMsg,   setErrorMsg]     = useState("");

  const displayName =
    clerkUser?.fullName ||
    clerkUser?.username ||
    clerkUser?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "User";

  useEffect(() => {
    if (initialToken) {
      validateAndJoin(initialToken);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  const validateAndJoin = async (rawInput) => {
    const token = parseToken(rawInput);
    if (!token) { setErrorMsg("Please enter a valid invite link or token."); return; }

    setValidating(true);
    setErrorMsg("");
    try {
      const res  = await fetch(`${API_BASE}/api/validate-token/${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Invalid or expired invite link.");
        return;
      }
      onJoin(token, data.roomId);
    } catch {
      setErrorMsg("Could not reach server. Check your connection.");
    } finally {
      setValidating(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setErrorMsg("");
    try {
      const res  = await fetch(`${API_BASE}/api/create-chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: clerkUser?.id || "anonymous" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to create chat room.");
        return;
      }

      try { await navigator.clipboard.writeText(data.inviteLink); } catch {}

      onJoin(data.token, data.roomId);
    } catch {
      setErrorMsg("Could not reach server. Is the backend running?");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinPasted = () => validateAndJoin(pastedLink);

  return (
    <div className="join-bg">
      <div className="grid-bg" />
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{
          position:"absolute",
          width: 280 + i * 100 + "px", height: 280 + i * 100 + "px",
          borderRadius:"50%",
          background: i % 2 === 0
            ? "radial-gradient(circle,rgba(61,214,245,.04) 0%,transparent 70%)"
            : "radial-gradient(circle,rgba(167,139,250,.04) 0%,transparent 70%)",
          top:`${12 + i * 19}%`, left:`${4 + i * 20}%`,
          pointerEvents:"none",
          animation:`glow-pulse ${3 + i}s infinite alternate`,
        }} />
      ))}
      <div className="join-card">
        <div className="brand-icon">🔒</div>
        <div className="join-title">NexChat</div>
        <div className="join-sub">Private, invite-only conversations</div>
        <div className="user-greeting">
          {clerkUser?.imageUrl
            ? <img className="user-avatar-sm" src={clerkUser.imageUrl} alt="" />
            : <div className="avatar" style={{ ...getAvatarStyle(displayName), width:28, height:28, borderRadius:8, fontSize:11 }}>
                {initials(displayName)}
              </div>}
          Signed in as <strong style={{ color:"var(--text)" }}>{displayName}</strong>
        </div>
        <button className="create-btn" onClick={handleCreate} disabled={creating || validating}>
          {creating ? "⏳ Creating chat…" : "＋ Create New Private Chat"}
        </button>
        <p style={{ fontSize:11, color:"var(--muted)", marginTop:8, textAlign:"center" }}>
          Generates a secret invite link — only people you share it with can join
        </p>
        <div className="divider">or join with a link</div>
        <div className="field-group">
          <label className="field-label">Paste invite link or token</label>
          <input
            className="field-input"
            placeholder="https://nexchat-red.vercel.app/?token=..."
            value={pastedLink}
            onChange={e => { setPastedLink(e.target.value); setErrorMsg(""); }}
            onKeyDown={e => e.key === "Enter" && handleJoinPasted()}
          />
        </div>
        <button
          className="join-btn"
          onClick={handleJoinPasted}
          disabled={!pastedLink.trim() || validating || creating}
        >
          {validating ? "Verifying…" : "Join Chat →"}
        </button>
        {errorMsg && <div className="error-msg">{errorMsg}</div>}
        <SignOutButton>
          <button className="sign-out-btn">Sign out</button>
        </SignOutButton>
      </div>
    </div>
  );
};

// ─── ChatScreen Component (with right-click menu & deletion for both types) ──
const ChatScreen = ({ username, roomId, token, clerkUser, onLeave }) => {
  const [message,       setMessage]       = useState("");
  const [messages,      setMessages]      = useState([]);
  const [image,         setImage]         = useState(null);
  const [imagePreview,  setImgPrev]       = useState(null);
  const [users,         setUsers]         = useState([]);
  const [typing,        setTyping]        = useState("");
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [lightbox,      setLightbox]      = useState(null);
  const [reactions,     setReactions]     = useState({});
  const [activePicker,  setActivePicker]  = useState(null);
  const [toast,         setToast]         = useState("");
  const [toastType,     setToastType]     = useState("info");
  const [imgUploading,  setImgUploading]  = useState(false);
  const [loadingHistory,setLoadingHistory]= useState(true);
  const [linkCopied,    setLinkCopied]    = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messageBuffer, setMessageBuffer] = useState([]);
  // Context menu state
  const [contextMenu,   setContextMenu]   = useState({ visible: false, x: 0, y: 0, msgId: null, sender: null });

  const endRef      = useRef();
  const fileRef     = useRef();
  const inputRef    = useRef();
  const typingTimer = useRef();

  const displayRoom = shortRoomId(roomId);

  const showToast = (msg, type = "info") => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(""), 3000);
  };

  const inviteLink = `${window.location.origin}${window.location.pathname}?token=${token}`;

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      showToast("🔗 Invite link copied! Share it with friends.");
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      showToast("Could not copy link — please copy it manually.", "error");
    }
  };

  // Context menu handlers
  const handleContextMenu = (e, msgId, sender) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      msgId,
      sender,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, msgId: null, sender: null });
  };

  const deleteMessage = () => {
    const { msgId } = contextMenu;
    if (!msgId) return;
    socket.emit("delete_message", { room: roomId, msgId, username });
    closeContextMenu();
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => closeContextMenu();
    if (contextMenu.visible) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu.visible]);

  // Socket setup with buffering
  useEffect(() => {
    socket.emit("join_room", { username, token });

    const onJoinError = ({ message: msg }) => {
      showToast(msg, "error");
      setTimeout(() => { if (onLeave) onLeave(); }, 2500);
    };

    const onChatHistory = (history) => {
      const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setMessages(sortedHistory);
      setLoadingHistory(false);
      setHistoryLoaded(true);

      setMessageBuffer(buffer => {
        if (buffer.length === 0) return [];
        const newMessages = [...sortedHistory];
        for (const msg of buffer) {
          if (!newMessages.some(m => m.id === msg.id)) {
            newMessages.push(msg);
          }
        }
        newMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setMessages(newMessages);
        return [];
      });
    };

    const onReceiveMessage = (data) => {
      if (!historyLoaded) {
        setMessageBuffer(prev => [...prev, data]);
      } else {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    };

    const onReceiveImage = (data) => {
      if (!historyLoaded) {
        setMessageBuffer(prev => [...prev, data]);
      } else {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
        setImgUploading(false);
      }
    };

    const onUpdateUsers = (data) => setUsers(data);
    const onUserTyping = ({ username: u, isTyping }) => setTyping(isTyping ? u : "");
    const onUpdateReaction = ({ msgId, emoji }) => {
      setReactions(prev => {
        const cur = prev[msgId] || {};
        const count = (cur[emoji] || 0) + 1;
        return { ...prev, [msgId]: { ...cur, [emoji]: count } };
      });
    };
    const onImageError = ({ message: errMsg }) => {
      setImgUploading(false);
      showToast(`⚠️ ${errMsg || "Image upload failed"}`, "error");
    };

    // Deletion events
    const onMessageDeleted = ({ msgId }) => {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    };
    const onDeleteError = ({ message }) => {
      showToast(`Delete failed: ${message}`, "error");
    };

    socket.on("join_error", onJoinError);
    socket.on("chat_history", onChatHistory);
    socket.on("receive_message", onReceiveMessage);
    socket.on("receive_image", onReceiveImage);
    socket.on("update_users", onUpdateUsers);
    socket.on("user_typing", onUserTyping);
    socket.on("update_reaction", onUpdateReaction);
    socket.on("image_error", onImageError);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("delete_error", onDeleteError);

    return () => {
      socket.off("join_error", onJoinError);
      socket.off("chat_history", onChatHistory);
      socket.off("receive_message", onReceiveMessage);
      socket.off("receive_image", onReceiveImage);
      socket.off("update_users", onUpdateUsers);
      socket.off("user_typing", onUserTyping);
      socket.off("update_reaction", onUpdateReaction);
      socket.off("image_error", onImageError);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("delete_error", onDeleteError);
    };
  }, [username, token, roomId, onLeave, historyLoaded]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit("send_message", {
      room: roomId,
      message: message.trim(),
      sender: username,
      timestamp: new Date().toISOString(),
    });
    setMessage("");
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const sendImage = () => {
    if (!image) return;
    setImgUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("send_image", {
        room: roomId,
        imageBase64: reader.result,
        sender: username,
        timestamp: new Date().toISOString(),
      });
      setImage(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImgPrev(null);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.onerror = () => {
      setImgUploading(false);
      showToast("⚠️ Could not read image file", "error");
    };
    reader.readAsDataURL(image);
  };

  const handleFileChange = e => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImgPrev(URL.createObjectURL(f));
  };

  const handleTyping = () => {
    socket.emit("typing_start", { room: roomId, username });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => socket.emit("typing_stop", { room: roomId }), 1200
    );
  };

  const addReaction = (msgId, emoji) => {
    socket.emit("message_reaction", { room: roomId, msgId, emoji, username });
    setActivePicker(null);
    closeContextMenu();
  };

  const insertEmoji = emoji => {
    setMessage(p => p + emoji);
    inputRef.current?.focus();
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      if (!isNaN(d)) return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    } catch {}
    return ts;
  };

  const mySocketId = socket.id;

  return (
    <div className="chat-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo"><div className="logo-dot" />NexChat</div>
          <div className="room-badge"><span>🔒</span> #{displayRoom}</div>
          <div className="private-badge">✦ Private chat</div>
        </div>
        <div className="users-section">
          <div className="section-label">Members — {users.length}</div>
          {users.map((u, i) => (
            <div key={u.id} className="user-item" style={{ animationDelay:`${i * 0.05}s` }}>
              <div className="online-ring"><div className="avatar" style={getAvatarStyle(u.username)}>{initials(u.username)}</div></div>
              <span className="user-name">{u.username}</span>
              {u.id === mySocketId && <span className="you-tag">you</span>}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="my-info">
            {clerkUser?.imageUrl
              ? <img src={clerkUser.imageUrl} alt="" style={{ width:38, height:38, borderRadius:11, objectFit:"cover" }} />
              : <div className="avatar" style={{ ...getAvatarStyle(username), width:38, height:38, borderRadius:11, fontSize:14 }}>{initials(username)}</div>}
            <div><div className="my-name">{username}</div><div className="my-status">● Active</div></div>
          </div>
          <SignOutButton><button className="sidebar-signout">Sign out</button></SignOutButton>
        </div>
      </aside>

      <main className="chat-main">
        <div className="chat-header">
          <div><div className="room-name">🔒 Private Chat</div><div className="room-subtitle">#{displayRoom} · Only invited members can see this</div></div>
          <div className="header-meta">
            <div className="member-count"><div className="status-dot" />{users.length} {users.length === 1 ? "member" : "members"}</div>
            <button className={`copy-link-btn${linkCopied ? " copied" : ""}`} onClick={copyInviteLink}>{linkCopied ? "✓ Copied!" : "🔗 Invite"}</button>
          </div>
        </div>

        <div className="messages-area">
          {loadingHistory ? (
            <div className="history-loading"><span className="spin-icon">⏳</span> Loading message history…</div>
          ) : (
            <>
              <div className="date-divider">PRIVATE CHAT · #{displayRoom}</div>
              {messages.map((msg, idx) => {
                const isOwn = msg.sender === username;
                const showAvatar = idx === 0 || messages[idx - 1]?.sender !== msg.sender;
                const msgReactions = reactions[msg.id] || {};
                return (
                  <div key={msg.id} className={`msg-row ${isOwn ? "own" : ""}`}>
                    {!isOwn && <div style={{ width:30, flexShrink:0 }}>{showAvatar && <div className="msg-avatar" style={getAvatarStyle(msg.sender)}>{initials(msg.sender)}</div>}</div>}
                    <div className="msg-content">
                      {showAvatar && !isOwn && <div className="msg-sender">{msg.sender}</div>}
                      <div style={{ position:"relative" }}>
                        <div
                          className={`msg-bubble ${isOwn ? "own" : "other"}`}
                          onContextMenu={(e) => handleContextMenu(e, msg.id, msg.sender)}
                          onDoubleClick={() => setActivePicker(p => p === msg.id ? null : msg.id)}
                          style={{ cursor:"pointer" }}
                          title="Right‑click for actions | Double‑click to react"
                        >
                          {msg.type === "image" ? (
                            <img
                              className="msg-img"
                              src={msg.imageUrl}
                              alt="shared"
                              onClick={() => setLightbox(msg.imageUrl)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                handleContextMenu(e, msg.id, msg.sender);
                              }}
                              onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }}
                            />
                          ) : msg.message}
                          {msg.type === "image" && <span style={{ display:"none", color:"var(--rose)", fontSize:12 }}>[Image failed to load]</span>}
                        </div>
                        {activePicker === msg.id && (
                          <div className="reaction-picker">
                            {REACTIONS.map(e => <span key={e} className="reaction-opt" onClick={() => addReaction(msg.id, e)}>{e}</span>)}
                          </div>
                        )}
                      </div>
                      {Object.keys(msgReactions).length > 0 && (
                        <div className="msg-reactions">
                          {Object.entries(msgReactions).map(([emoji, count]) => (
                            <div key={emoji} className="reaction-chip" onClick={() => addReaction(msg.id, emoji)}>{emoji}<span>{count}</span></div>
                          ))}
                        </div>
                      )}
                      <div className="msg-time">{formatTime(msg.timestamp)}</div>
                    </div>
                    {isOwn && <div style={{ width:30, flexShrink:0 }} />}
                  </div>
                );
              })}
            </>
          )}
          <div ref={endRef} />
        </div>

        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div className="reaction-row">
              {REACTIONS.map(emoji => (
                <span
                  key={emoji}
                  className="reaction-opt"
                  onClick={() => {
                    addReaction(contextMenu.msgId, emoji);
                    closeContextMenu();
                  }}
                >
                  {emoji}
                </span>
              ))}
            </div>
            {contextMenu.sender === username && (
              <>
                <div className="context-menu-divider" />
                <div className="context-menu-item" onClick={deleteMessage}>
                  🗑️ Delete message
                </div>
              </>
            )}
          </div>
        )}

        <div className="typing-bar">{typing && <><div className="typing-dots"><span /><span /><span /></div>{typing} is typing…</>}</div>

        <div className="input-bar" style={{ position:"relative" }}>
          {imgUploading && <div className="uploading-indicator"><span className="spin-icon">⏳</span> Uploading to Cloudinary…</div>}
          {imagePreview && !imgUploading && (
            <div className="image-preview">
              <img className="preview-thumb" src={imagePreview} alt="preview" />
              <span className="preview-name">{image?.name}</span>
              <div className="preview-remove" onClick={() => {
                setImage(null);
                if (imagePreview) URL.revokeObjectURL(imagePreview);
                setImgPrev(null);
                if (fileRef.current) fileRef.current.value = "";
              }}>✕</div>
              <button className="icon-btn accent" onClick={sendImage} style={{ width:36, height:36 }}>↑</button>
            </div>
          )}
          <div className="input-row">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display:"none" }} />
            <button className="icon-btn" onClick={() => fileRef.current.click()} disabled={imgUploading} title="Attach image">📎</button>
            <textarea ref={inputRef} className="msg-input" rows={1} value={message} placeholder="Message your private group…" onChange={e => { setMessage(e.target.value); handleTyping(); }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} style={{ height:"42px", lineHeight:"18px", paddingTop:"12px" }} />
            <button className="icon-btn" onClick={() => setShowEmoji(p => !p)} title="Emoji">😊</button>
            <button className="icon-btn accent" onClick={sendMessage} title="Send (Enter)">➤</button>
          </div>
          {showEmoji && <div className="emoji-picker">{EMOJI_PANEL.map(e => <span key={e} className="emoji-btn" onClick={() => insertEmoji(e)}>{e}</span>)}</div>}
        </div>
      </main>

      {lightbox && <div className="lightbox" onClick={() => setLightbox(null)}><img src={lightbox} alt="full" /></div>}
      {toast && <div className={`toast ${toastType === "error" ? "error" : ""}`}>{toast}</div>}
    </div>
  );
};

// ─── Root Chat ────────────────────────────────────────────────────────────────
const Chat = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const [token,  setToken]  = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const urlToken  = params.get("token");
    if (urlToken) {
      setToken(urlToken);
      try { sessionStorage.setItem("nexchat_token", urlToken); } catch {}
    } else {
      try {
        const saved = sessionStorage.getItem("nexchat_token");
        if (saved) setToken(saved);
      } catch {}
    }
  }, []);

  const displayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "User";

  if (!isLoaded) return <div className="clerk-wrapper"><div style={{ color:"var(--muted)", display:"flex", alignItems:"center", gap:8 }}><span className="spin-icon">⏳</span> Loading…</div></div>;
  if (!isSignedIn) return <div className="clerk-wrapper"><SignIn /></div>;
  if (!joined) {
    return (
      <PrivateJoinScreen
        clerkUser={user}
        initialToken={token}
        onJoin={(tok, rId) => {
          setToken(tok);
          setRoomId(rId);
          setJoined(true);
          try { sessionStorage.setItem("nexchat_token", tok); } catch {}
          window.history.replaceState({}, "", window.location.pathname);
        }}
      />
    );
  }

  return (
    <ChatScreen
      username={displayName}
      roomId={roomId}
      token={token}
      clerkUser={user}
      onLeave={() => {
        setJoined(false); setToken(null); setRoomId(null);
        try { sessionStorage.removeItem("nexchat_token"); } catch {}
      }}
    />
  );
};

export default Chat;