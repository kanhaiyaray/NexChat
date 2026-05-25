import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { SignIn, SignOutButton, useUser } from "@clerk/clerk-react";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:1000";
const API_BASE = SOCKET_URL;
const socket = io(SOCKET_URL);

const EMOJI_PANEL = ["😂", "🔥", "❤️", "👍", "😮", "😢", "🎉", "💀", "🤯", "👀", "✅", "💯"];
const REACTIONS = ["❤️", "🔥", "😂", "👍", "😮", "💯"];
const AVATAR_COLORS = [
  ["rgba(61,214,245,.25)", "#3dd6f5"],
  ["rgba(167,139,250,.25)", "#a78bfa"],
  ["rgba(244,114,182,.25)", "#f472b6"],
  ["rgba(52,211,153,.25)", "#34d399"],
  ["rgba(251,191,36,.25)", "#fbbf24"],
  ["rgba(248,113,113,.25)", "#f87171"],
];
const EDIT_WINDOW_MS = 5 * 60 * 1000;

const styleId = "nexchat-styles";

if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const styleSheet = document.createElement("style");
  styleSheet.id = styleId;
  styleSheet.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #070b14;
      --surface: #0d1320;
      --panel: #111827;
      --panel-2: #141d30;
      --border: rgba(99,210,255,0.12);
      --cyan: #3dd6f5;
      --violet: #a78bfa;
      --rose: #f472b6;
      --green: #34d399;
      --gold: #fbbf24;
      --text: #e2e8f0;
      --muted: #64748b;
      --highlight: rgba(251,191,36,.22);
      --highlight-strong: rgba(251,191,36,.34);
      --glow-c: 0 0 24px rgba(61,214,245,0.25);
    }

    body { background: var(--bg); font-family: 'DM Sans', sans-serif; color: var(--text); }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(99,210,255,.16); border-radius: 999px; }

    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
    @keyframes glowPulse { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes flashHighlight { 0% { box-shadow: 0 0 0 rgba(251,191,36,0); } 30% { box-shadow: 0 0 0 4px rgba(251,191,36,.18); } 100% { box-shadow: 0 0 0 rgba(251,191,36,0); } }

    .clerk-wrapper, .join-bg {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(ellipse 80% 60% at 50% -10%, rgba(61,214,245,.08) 0%, transparent 70%),
        radial-gradient(ellipse 50% 40% at 90% 80%, rgba(167,139,250,.07) 0%, transparent 60%),
        var(--bg);
    }

    .join-bg { position: relative; overflow: hidden; }
    .grid-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image: linear-gradient(rgba(99,210,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,210,255,.04) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%);
    }

    .join-card {
      position: relative;
      width: 440px;
      max-width: calc(100vw - 24px);
      padding: 40px 32px;
      border-radius: 24px;
      border: 1px solid var(--border);
      background: linear-gradient(135deg, rgba(13,19,32,.97), rgba(17,24,39,.98));
      backdrop-filter: blur(24px);
      box-shadow: 0 32px 64px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06);
      animation: fadeUp .4s ease both;
    }

    .join-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60%;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--cyan), transparent);
    }

    .brand-icon, .avatar, .msg-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-icon {
      width: 56px;
      height: 56px;
      margin-bottom: 22px;
      border-radius: 16px;
      border: 1px solid rgba(61,214,245,.2);
      background: linear-gradient(135deg, rgba(61,214,245,.15), rgba(167,139,250,.15));
      box-shadow: var(--glow-c);
      font-size: 24px;
    }

    .join-title, .sidebar-logo, .room-name, .search-empty-title {
      font-family: 'Syne', sans-serif;
    }

    .join-title {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--cyan), var(--violet));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .join-sub { margin: 6px 0 26px; color: var(--muted); font-size: 14px; }

    .user-greeting {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 22px;
      padding: 10px 14px;
      border-radius: 12px;
      background: rgba(61,214,245,.06);
      border: 1px solid rgba(61,214,245,.12);
      color: var(--cyan);
      font-size: 13px;
    }

    .user-avatar-sm { width: 28px; height: 28px; border-radius: 8px; object-fit: cover; }

    .create-btn, .join-btn, .sidebar-signout, .copy-link-btn, .jump-badge, .search-action-btn {
      cursor: pointer;
      transition: .16s ease;
    }

    .create-btn {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--cyan), var(--violet));
      color: #070b14;
      font-family: 'Syne', sans-serif;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: .04em;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 28px rgba(61,214,245,.3);
    }

    .create-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent);
      background-size: 200% 100%;
      animation: shimmer 2.5s infinite;
    }

    .create-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(61,214,245,.4); }
    .create-btn:disabled, .join-btn:disabled, .icon-btn:disabled, .search-action-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }

    .divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0;
      font-size: 11px;
      color: var(--muted);
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .field-group { margin-bottom: 14px; }
    .field-label, .section-label, .search-section-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--muted);
      letter-spacing: .08em;
      text-transform: uppercase;
      margin-bottom: 8px;
      display: block;
    }

    .field-input, .search-input, .msg-input {
      width: 100%;
      outline: none;
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.05);
      transition: border-color .2s, box-shadow .2s, background .2s;
    }

    .field-input, .search-input {
      border-radius: 12px;
      padding: 13px 16px;
      font-size: 14px;
    }

    .field-input::placeholder, .search-input::placeholder, .msg-input::placeholder { color: var(--muted); }
    .field-input:focus, .search-input:focus, .msg-input:focus {
      border-color: rgba(61,214,245,.38);
      box-shadow: 0 0 0 3px rgba(61,214,245,.08);
      background: rgba(61,214,245,.04);
    }

    .join-btn {
      width: 100%;
      margin-top: 12px;
      padding: 13px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.06);
      color: var(--text);
      font-family: 'Syne', sans-serif;
      font-size: 14px;
      font-weight: 600;
    }

    .join-btn:hover { background: rgba(255,255,255,.1); border-color: rgba(99,210,255,.25); }

    .sign-out-btn, .sidebar-signout {
      display: block;
      width: 100%;
      padding: 9px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      font-size: 12px;
    }

    .sidebar-signout:hover, .sign-out-btn:hover {
      background: rgba(244,114,182,.06);
      border-color: rgba(244,114,182,.3);
      color: var(--rose);
    }

    .error-msg {
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: 10px;
      background: rgba(244,114,182,.08);
      border: 1px solid rgba(244,114,182,.2);
      color: var(--rose);
      font-size: 12px;
      text-align: center;
    }

    .chat-layout {
      height: 100vh;
      display: flex;
      background: radial-gradient(ellipse 70% 50% at 20% -20%, rgba(61,214,245,.05) 0%, transparent 60%), var(--bg);
    }

    .sidebar {
      width: 270px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--surface);
      border-right: 1px solid var(--border);
    }

    .sidebar-header, .chat-header {
      border-bottom: 1px solid var(--border);
    }

    .sidebar-header { padding: 20px 20px 16px; }
    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--cyan), var(--violet));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .logo-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--cyan);
      box-shadow: var(--glow-c);
      animation: glowPulse 2s infinite;
    }

    .room-badge, .private-badge, .jump-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      font-size: 12px;
      white-space: nowrap;
    }

    .room-badge {
      margin: 10px 20px 0;
      padding: 5px 10px;
      color: var(--cyan);
      background: rgba(61,214,245,.08);
      border: 1px solid rgba(61,214,245,.15);
    }

    .private-badge {
      margin: 8px 20px 0;
      padding: 4px 9px;
      color: var(--violet);
      background: rgba(167,139,250,.08);
      border: 1px solid rgba(167,139,250,.18);
    }

    .users-section {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .user-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 10px;
    }

    .user-item:hover { background: rgba(255,255,255,.04); }
    .avatar, .msg-avatar {
      border-radius: 10px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .avatar { width: 32px; height: 32px; font-size: 13px; }
    .msg-avatar { width: 30px; height: 30px; border-radius: 9px; font-size: 12px; margin-bottom: 2px; }
    .online-ring { position: relative; flex-shrink: 0; }
    .online-ring::after {
      content: '';
      position: absolute;
      right: -1px;
      bottom: -1px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--green);
      border: 2px solid var(--surface);
    }

    .user-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 500;
    }

    .you-tag {
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(255,255,255,.06);
      color: var(--muted);
      font-size: 10px;
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border);
    }

    .my-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .my-name { font-size: 13px; font-weight: 500; }
    .my-status { font-size: 11px; color: var(--green); }
    .chat-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

    .chat-header {
      padding: 16px 24px;
      background: rgba(13,19,32,.8);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-shrink: 0;
    }

    .room-name { font-size: 18px; font-weight: 700; color: var(--text); }
    .room-subtitle { margin-top: 2px; color: var(--muted); font-size: 11px; }
    .header-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .member-count { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px var(--green);
    }

    .copy-link-btn, .jump-badge, .search-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid rgba(167,139,250,.25);
      background: rgba(167,139,250,.1);
      color: var(--violet);
      font-size: 12px;
      font-weight: 500;
    }

    .copy-link-btn:hover, .search-action-btn:hover { background: rgba(167,139,250,.18); border-color: rgba(167,139,250,.4); }
    .copy-link-btn.copied { color: var(--green); background: rgba(52,211,153,.1); border-color: rgba(52,211,153,.25); }

    .header-search-shell {
      position: relative;
      min-width: min(420px, 100%);
      flex: 1;
      max-width: 520px;
    }

    .header-search-form {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 9px 9px 14px;
      border-radius: 16px;
      border: 1px solid rgba(99,210,255,.16);
      background:
        linear-gradient(135deg, rgba(61,214,245,.08), rgba(167,139,250,.06)),
        rgba(255,255,255,.04);
      color: var(--muted);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
    }

    .header-search-form:hover,
    .header-search-form:focus-within {
      background:
        linear-gradient(135deg, rgba(61,214,245,.12), rgba(167,139,250,.1)),
        rgba(255,255,255,.06);
      border-color: rgba(99,210,255,.34);
      box-shadow: 0 10px 28px rgba(8,16,34,.24), 0 0 0 3px rgba(61,214,245,.08);
    }

    .header-search-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(255,255,255,.05);
      color: var(--cyan);
      flex-shrink: 0;
      font-size: 15px;
    }

    .header-search-input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--text);
      font-size: 14px;
      font-weight: 500;
      letter-spacing: .01em;
      font-family: inherit;
    }

    .header-search-input::placeholder { color: var(--muted); }

    .header-search-submit {
      border: none;
      border-radius: 10px;
      min-width: 80px;
      padding: 9px 14px;
      background: linear-gradient(135deg, var(--cyan), var(--violet));
      color: #070b14;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 20px rgba(61,214,245,.18);
    }

    .header-search-submit:disabled { opacity: .5; cursor: not-allowed; }

    .header-search-clear {
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 10px;
      min-width: 72px;
      padding: 9px 12px;
      background: rgba(255,255,255,.05);
      color: var(--text);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: .16s ease;
    }

    .header-search-clear:hover {
      background: rgba(255,255,255,.1);
      border-color: rgba(255,255,255,.16);
    }

    .header-search-clear:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    .history-loading, .search-loading, .search-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--muted);
      font-size: 13px;
    }

    .history-loading { padding: 24px; }
    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      scroll-behavior: smooth;
    }

    .date-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 12px 0;
      color: var(--muted);
      font-size: 11px;
      letter-spacing: .06em;
    }

    .date-divider::before, .date-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .search-context-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 14px;
      padding: 12px 14px;
      border-radius: 14px;
      background: linear-gradient(180deg, rgba(251,191,36,.09), rgba(244,114,182,.06));
      border: 1px solid rgba(251,191,36,.14);
      color: var(--text);
      font-size: 13px;
    }

    .msg-row { display: flex; align-items: flex-end; gap: 10px; animation: fadeUp .2s ease both; }
    .msg-row.own { flex-direction: row-reverse; }
    .msg-content { max-width: 68%; }
    .msg-sender { margin-bottom: 3px; padding: 0 12px; color: var(--muted); font-size: 11px; }
    .msg-row.own .msg-sender { text-align: right; }
    .msg-bubble {
      position: relative;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.55;
      word-break: break-word;
    }

    .msg-bubble.other {
      background: var(--panel);
      border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
      color: var(--text);
    }

    .msg-bubble.own {
      background: linear-gradient(135deg, rgba(61,214,245,.18), rgba(167,139,250,.18));
      border: 1px solid rgba(167,139,250,.2);
      border-bottom-right-radius: 4px;
      color: var(--text);
    }

    .msg-bubble.targeted {
      animation: flashHighlight 1.4s ease;
      border-color: rgba(251,191,36,.28);
    }

    .match-highlight {
      padding: 0 .1em;
      border-radius: 5px;
      background: var(--highlight);
      box-shadow: inset 0 0 0 1px rgba(251,191,36,.12);
    }

    .match-highlight.targeted { background: var(--highlight-strong); }
    .msg-time { margin-top: 3px; padding: 0 4px; color: var(--muted); font-size: 10px; }
    .msg-row.own .msg-time { text-align: right; }
    .edited-tag {
      margin-left: 6px;
      color: var(--cyan);
      font-size: 10px;
      letter-spacing: .03em;
    }
    .msg-img {
      display: block;
      max-width: 220px;
      margin-top: 2px;
      border-radius: 12px;
      cursor: pointer;
      transition: transform .2s;
    }
    .msg-img:hover { transform: scale(1.03); }

    .msg-reactions, .reaction-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .msg-reactions { margin-top: 6px; }
    .reaction-chip {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(255,255,255,.07);
      border: 1px solid var(--border);
      cursor: pointer;
      font-size: 13px;
    }
    .reaction-chip:hover { background: rgba(255,255,255,.12); }
    .reaction-chip span { color: var(--muted); font-size: 11px; }
    .reaction-picker, .context-menu {
      background: var(--panel);
      border: 1px solid var(--border);
      box-shadow: 0 16px 40px rgba(0,0,0,.45);
      z-index: 50;
    }
    .reaction-picker {
      position: absolute;
      left: 0;
      bottom: calc(100% + 8px);
      display: flex;
      gap: 6px;
      padding: 8px;
      border-radius: 12px;
    }
    .reaction-opt, .emoji-btn {
      cursor: pointer;
      border-radius: 8px;
      transition: .12s ease;
    }
    .reaction-opt {
      padding: 2px;
      font-size: 18px;
    }
    .reaction-opt:hover, .emoji-btn:hover { transform: scale(1.18); background: rgba(255,255,255,.08); }

    .typing-bar {
      height: 24px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      color: var(--muted);
      font-size: 12px;
      font-style: italic;
      flex-shrink: 0;
    }
    .typing-dots { display: inline-flex; gap: 3px; margin-right: 6px; }
    .typing-dots span {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--cyan);
      animation: blink 1s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: .2s; }
    .typing-dots span:nth-child(3) { animation-delay: .4s; }

    .input-bar {
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      background: rgba(13,19,32,.92);
      backdrop-filter: blur(12px);
      flex-shrink: 0;
    }

    .image-preview {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.04);
    }
    .preview-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 8px; }
    .preview-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--muted);
      font-size: 12px;
    }
    .preview-remove {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: rgba(244,114,182,.1);
      border: 1px solid rgba(244,114,182,.2);
      color: var(--rose);
      cursor: pointer;
    }
    .preview-remove:hover { background: rgba(244,114,182,.2); }
    .input-row { display: flex; align-items: center; gap: 10px; }
    .msg-input {
      flex: 1;
      resize: none;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 14px;
    }
    .icon-btn {
      width: 42px;
      height: 42px;
      flex-shrink: 0;
      border-radius: 11px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.04);
      color: var(--muted);
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: .15s ease;
    }
    .icon-btn:hover { background: rgba(255,255,255,.08); color: var(--text); border-color: rgba(255,255,255,.15); }
    .icon-btn:active { transform: scale(.95); }
    .icon-btn.accent {
      border: none;
      color: #070b14;
      background: linear-gradient(135deg, var(--cyan), var(--violet));
      box-shadow: 0 4px 16px rgba(61,214,245,.25);
    }
    .icon-btn.accent:hover { box-shadow: 0 6px 20px rgba(61,214,245,.35); }
    .emoji-picker {
      position: absolute;
      right: 24px;
      bottom: 72px;
      width: 220px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 12px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--panel);
      box-shadow: 0 16px 40px rgba(0,0,0,.55);
      z-index: 20;
    }
    .emoji-btn { padding: 4px; font-size: 20px; }

    .lightbox {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .lightbox {
      background: rgba(0,0,0,.85);
      backdrop-filter: blur(8px);
      cursor: pointer;
    }
    .lightbox img {
      max-width: 90vw;
      max-height: 90vh;
      border-radius: 12px;
      box-shadow: 0 24px 64px rgba(0,0,0,.8);
    }

    .toast {
      position: fixed;
      left: 50%;
      bottom: 32px;
      transform: translateX(-50%);
      padding: 10px 20px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      font-size: 13px;
      box-shadow: 0 8px 24px rgba(0,0,0,.5);
      z-index: 200;
      pointer-events: none;
    }
    .toast.error { color: var(--rose); border-color: rgba(244,114,182,.3); }
    .uploading-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding: 6px 12px;
      border-radius: 8px;
      background: rgba(255,255,255,.04);
      color: var(--muted);
      font-size: 12px;
    }
    .spin-icon { display: inline-block; animation: spin 1s linear infinite; }

    .context-menu {
      position: fixed;
      padding: 8px;
      border-radius: 12px;
      animation: fadeUp .15s ease;
      z-index: 120;
    }
    .context-menu-item {
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
    }
    .context-menu-item:hover { background: rgba(255,255,255,.08); }
    .context-menu-divider { height: 1px; margin: 6px 0; background: var(--border); }
    .reaction-row { gap: 8px; padding: 4px; }
    .message-edit-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      border-radius: 16px;
      border: 1px solid rgba(99,210,255,.18);
      background: rgba(255,255,255,.04);
    }
    .message-edit-input {
      width: 100%;
      min-height: 84px;
      resize: vertical;
      border: 1px solid rgba(99,210,255,.12);
      border-radius: 12px;
      background: rgba(8,13,24,.72);
      color: var(--text);
      font: inherit;
      line-height: 1.5;
      padding: 12px 14px;
      outline: none;
    }
    .message-edit-input:focus {
      border-color: rgba(99,210,255,.32);
      box-shadow: 0 0 0 3px rgba(61,214,245,.08);
    }
    .message-edit-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .message-edit-btn {
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 10px;
      background: rgba(255,255,255,.05);
      color: var(--text);
      font-size: 12px;
      font-weight: 700;
      padding: 8px 12px;
      cursor: pointer;
      transition: .16s ease;
    }
    .message-edit-btn:hover { background: rgba(255,255,255,.1); }
    .message-edit-btn.primary {
      border: none;
      background: linear-gradient(135deg, var(--cyan), var(--violet));
      color: #070b14;
    }
    .message-edit-btn:disabled { opacity: .5; cursor: not-allowed; }

    .search-inline-panel {
      position: absolute;
      top: calc(100% + 10px);
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px;
      border-radius: 18px;
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(13,19,32,.99), rgba(17,24,39,.99));
      box-shadow: 0 24px 60px rgba(0,0,0,.45);
      z-index: 80;
      max-height: min(60vh, 520px);
    }

    .search-panel-status {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: var(--muted);
      font-size: 12px;
    }

    .search-panel-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(99,210,255,.14);
      background: rgba(255,255,255,.04);
      color: var(--text);
      white-space: nowrap;
    }

    .search-results {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 120px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .search-result {
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.035);
      cursor: pointer;
      text-align: left;
      color: inherit;
    }
    .search-result:hover {
      background: rgba(255,255,255,.07);
      border-color: rgba(99,210,255,.25);
      transform: translateY(-1px);
    }

    .search-result-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 12px;
    }

    .search-result-sender {
      color: var(--text);
      font-weight: 600;
      font-size: 13px;
    }

    .search-result-text {
      color: #dbe8ff;
      font-size: 14px;
      line-height: 1.6;
      word-break: break-word;
    }

    .search-empty {
      flex: 1;
      min-height: 140px;
      flex-direction: column;
      gap: 10px;
      border-radius: 18px;
      border: 1px dashed rgba(99,210,255,.16);
      background: rgba(255,255,255,.025);
    }

    .search-empty-title { font-size: 20px; font-weight: 700; }
    .search-empty-copy, .search-error-copy { max-width: 420px; text-align: center; color: var(--muted); font-size: 13px; line-height: 1.6; }
    .search-error {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(244,114,182,.18);
      background: rgba(244,114,182,.08);
      color: var(--rose);
      font-size: 13px;
    }

    .sidebar-overlay { display: none; }
    .mobile-menu-btn, .mobile-menu-close { display: none; }

    @media (max-width: 900px) {
      .chat-header { flex-wrap: wrap; }
      .header-meta { width: 100%; justify-content: space-between; }
      .header-search-shell { min-width: 0; width: 100%; max-width: none; }
    }

    @media (max-width: 768px) {
      .chat-layout { flex-direction: column; height: 100dvh; overflow: hidden; }
      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        width: 280px;
        height: 100dvh;
        z-index: 1000;
        transform: translateX(-100%);
        transition: transform .25s cubic-bezier(.2,.9,.4,1.1);
        box-shadow: 2px 0 20px rgba(0,0,0,.3);
      }
      .sidebar.open { transform: translateX(0); }
      .sidebar-overlay {
        position: fixed;
        inset: 0;
        display: none;
        background: rgba(0,0,0,.5);
        backdrop-filter: blur(4px);
        z-index: 999;
      }
      .sidebar-overlay.open { display: block; }
      body.no-scroll { overflow: hidden; }
      .chat-main { width: 100%; height: 100%; }
      .mobile-menu-btn, .mobile-menu-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: rgba(255,255,255,.08);
        color: var(--text);
        cursor: pointer;
        flex-shrink: 0;
      }
      .copy-link-btn span:last-child, .member-count span.label { display: none; }
      .copy-link-btn { width: 44px; padding: 0; justify-content: center; }
      .msg-content { max-width: 84%; }
      .msg-bubble { font-size: 15px; }
      .icon-btn { width: 48px; height: 48px; font-size: 22px; }
      .msg-input { font-size: 16px; }
      .emoji-picker { right: 16px; bottom: 80px; width: 260px; }
      .context-menu { min-width: 160px; padding: 12px; }
      .header-search-form { width: 100%; }
      .search-inline-panel { max-height: 50vh; }
    }

    @media (max-width: 480px) {
      .join-card { padding: 32px 22px; }
      .chat-header { padding: 12px 16px; }
      .room-name { font-size: 16px; }
      .messages-area { padding: 16px; }
      .input-bar { padding: 14px 16px; }
      .typing-bar { padding: 0 16px; }
      .header-search-form { padding-left: 12px; }
      .header-search-submit { padding: 9px 10px; }
    }

    /* === Pinned messages styles === */
    .pins-section {
      border-top: 1px solid var(--border);
      margin-top: 8px;
    }
    .pins-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: var(--cyan);
      user-select: none;
    }
    .pins-header:hover {
      background: rgba(255,255,255,.04);
    }
    .pins-list {
      max-height: 200px;
      overflow-y: auto;
      padding: 0 12px 12px;
    }
    .pin-item {
      padding: 8px 10px;
      border-radius: 12px;
      background: rgba(255,255,255,.04);
      margin-bottom: 8px;
      cursor: pointer;
      transition: all .15s;
    }
    .pin-item:hover {
      background: rgba(61,214,245,.1);
      transform: translateX(2px);
    }
    .pin-sender {
      font-size: 12px;
      font-weight: 600;
      color: var(--violet);
    }
    .pin-snippet {
      font-size: 12px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pins-empty {
      padding: 12px;
      text-align: center;
      color: var(--muted);
      font-size: 12px;
    }

    /* === Read receipt styles === */
    .read-receipt {
      display: inline-block;
      margin-left: 8px;
      font-size: 10px;
      color: var(--cyan);
      cursor: help;
    }
  `;
  document.head.appendChild(styleSheet);
}

function parseToken(input = "") {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get("token");
    if (token) return token;
  } catch {}
  return trimmed;
}

function shortRoomId(roomId = "") {
  return roomId.replace(/^room_/, "").slice(0, 8) || "private";
}

function getAvatarStyle(name = "") {
  const safeName = name || "User";
  const [bg, color] = AVATAR_COLORS[safeName.charCodeAt(0) % AVATAR_COLORS.length];
  return { background: bg, color };
}

function initials(name = "") {
  return (name || "U").slice(0, 2).toUpperCase();
}

function formatTime(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return String(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatSearchTime(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text = "", query = "", targeted = false) {
  if (!query.trim()) return text;
  const pattern = new RegExp(`(${escapeRegExp(query.trim())})`, "ig");
  const parts = String(text).split(pattern);
  return parts.map((part, index) => {
    if (part.toLowerCase() === query.trim().toLowerCase()) {
      return (
        <mark
          key={`${part}-${index}`}
          className={`match-highlight${targeted ? " targeted" : ""}`}
        >
          {part}
        </mark>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function mergeMessages(existing, incoming) {
  const map = new Map(existing.map((message) => [message.id, message]));
  incoming.forEach((message) => {
    if (!message?.id) return;
    map.set(message.id, { ...(map.get(message.id) || {}), ...message });
  });
  return [...map.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function buildReactionsMap(messages = []) {
  return messages.reduce((acc, msg) => {
    if (msg?.id && msg?.reactions && Object.keys(msg.reactions).length > 0) {
      acc[msg.id] = msg.reactions;
    }
    return acc;
  }, {});
}

function mergeReactionMaps(current, messages = []) {
  const next = { ...current };
  messages.forEach((msg) => {
    if (msg?.id && msg?.reactions && Object.keys(msg.reactions).length > 0) {
      next[msg.id] = { ...(next[msg.id] || {}), ...msg.reactions };
    }
  });
  return next;
}

function isEditableMessage(message, username) {
  if (!message || message.type !== "text" || message.sender !== username) {
    return false;
  }
  const timestamp = new Date(message.timestamp).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return Date.now() - timestamp <= EDIT_WINDOW_MS;
}

const PrivateJoinScreen = ({ clerkUser, initialToken, onJoin }) => {
  const [pastedLink, setPastedLink] = useState("");
  const [creating, setCreating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
    if (!token) {
      setErrorMsg("Please enter a valid invite link or token.");
      return;
    }

    setValidating(true);
    setErrorMsg("");

    try {
      const response = await fetch(`${API_BASE}/api/validate-token/${encodeURIComponent(token)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Invalid link");
      }
      onJoin(token, data.roomId);
    } catch (error) {
      setErrorMsg(error.message || "Could not reach the server.");
    } finally {
      setValidating(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setErrorMsg("");

    try {
      const response = await fetch(`${API_BASE}/api/create-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clerkUser?.id || "anonymous" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Creation failed");
      }
      try {
        await navigator.clipboard.writeText(data.inviteLink);
      } catch {}
      onJoin(data.token, data.roomId);
    } catch (error) {
      setErrorMsg(error.message || "Server error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="join-bg">
      <div className="grid-bg" />
      {[...Array(4)].map((_, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            width: `${280 + index * 100}px`,
            height: `${280 + index * 100}px`,
            borderRadius: "50%",
            background:
              index % 2 === 0
                ? "radial-gradient(circle,rgba(61,214,245,.04) 0%,transparent 70%)"
                : "radial-gradient(circle,rgba(167,139,250,.04) 0%,transparent 70%)",
            top: `${12 + index * 19}%`,
            left: `${4 + index * 20}%`,
            pointerEvents: "none",
            animation: `glowPulse ${3 + index}s infinite alternate`,
          }}
        />
      ))}
      <div className="join-card">
        <div className="brand-icon">🔒</div>
        <div className="join-title">NexChat</div>
        <div className="join-sub">Private, invite-only conversations</div>

        <div className="user-greeting">
          {clerkUser?.imageUrl ? (
            <img className="user-avatar-sm" src={clerkUser.imageUrl} alt="" />
          ) : (
            <div className="avatar" style={{ ...getAvatarStyle(displayName), width: 28, height: 28, borderRadius: 8, fontSize: 11 }}>
              {initials(displayName)}
            </div>
          )}
          Signed in as <strong style={{ color: "var(--text)" }}>{displayName}</strong>
        </div>

        <button className="create-btn" onClick={handleCreate} disabled={creating || validating}>
          {creating ? "Creating chat..." : "+ Create New Private Chat"}
        </button>

        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, textAlign: "center" }}>
          Generates a secret invite link. Only people you share it with can join.
        </p>

        <div className="divider">or join with a link</div>

        <div className="field-group">
          <label className="field-label">Paste invite link or token</label>
          <input
            className="field-input"
            placeholder="https://your-nexchat-link/?token=..."
            value={pastedLink}
            onChange={(event) => {
              setPastedLink(event.target.value);
              setErrorMsg("");
            }}
            onKeyDown={(event) => event.key === "Enter" && validateAndJoin(pastedLink)}
          />
        </div>

        <button
          className="join-btn"
          onClick={() => validateAndJoin(pastedLink)}
          disabled={!pastedLink.trim() || validating || creating}
        >
          {validating ? "Verifying..." : "Join Chat ->"}
        </button>

        {errorMsg ? <div className="error-msg">{errorMsg}</div> : null}

        <SignOutButton>
          <button className="sign-out-btn">Sign out</button>
        </SignOutButton>
      </div>
    </div>
  );
};

const ChatScreen = ({ username, roomId, token, clerkUser, onLeave }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [reactions, setReactions] = useState({});
  const [activePicker, setActivePicker] = useState(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("info");
  const [imgUploading, setImgUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingDraft, setEditingDraft] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messageBuffer, setMessageBuffer] = useState([]);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, msgId: null, sender: null, type: "text" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState("");

  // Pinning & read receipts state
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [pinsOpen, setPinsOpen] = useState(true);
  const [readReceipts, setReadReceipts] = useState({});

  const endRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);
  const toastTimer = useRef(null);
  const messagesAreaRef = useRef(null);
  const messageRefs = useRef(new Map());
  const searchInputRef = useRef(null);
  const searchShellRef = useRef(null);
  const pendingScrollTargetRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  const displayRoom = shortRoomId(roomId);
  const inviteLink = `${window.location.origin}${window.location.pathname}?token=${token}`;
  const mySocketId = socket.id;

  const showToast = (text, type = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(text);
    setToastType(type);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    return () => document.body.classList.remove("no-scroll");
  }, [sidebarOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchFocused(true);
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSearchFocused(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!searchShellRef.current?.contains(event.target)) {
        setSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleContextMenu = (event, msgId, sender) => {
    event.preventDefault();
    const targetMessage = messages.find((msg) => msg.id === msgId);
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      msgId,
      sender,
      type: targetMessage?.type || "text",
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, msgId: null, sender: null, type: "text" });
  };

  const deleteMessage = () => {
    if (!contextMenu.msgId) return;
    socket.emit("delete_message", { room: roomId, msgId: contextMenu.msgId, username });
    closeContextMenu();
  };

  const beginEditingMessage = () => {
    const { msgId } = contextMenu;
    if (!msgId) return;
    const targetMessage = messages.find((msg) => msg.id === msgId);
    if (!targetMessage || !isEditableMessage(targetMessage, username)) {
      showToast("This message can no longer be edited.", "error");
      closeContextMenu();
      return;
    }
    setEditingMessageId(msgId);
    setEditingDraft(targetMessage.message || "");
    closeContextMenu();
  };

  const cancelEditingMessage = () => {
    setEditingMessageId("");
    setEditingDraft("");
    setEditSaving(false);
  };

  useEffect(() => {
    if (!contextMenu.visible) return undefined;
    const handleClick = () => closeContextMenu();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu.visible]);

  useEffect(() => {
    socket.emit("join_room", { username, token });
    socket.emit("get_pinned_messages", { room: roomId });

    const onJoinError = ({ message: errorMessage }) => {
      showToast(errorMessage, "error");
      setTimeout(() => {
        if (onLeave) onLeave();
      }, 2500);
    };

    const onChatHistory = (history) => {
      const sorted = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setMessages(sorted);
      setReactions(buildReactionsMap(sorted));
      // Populate read receipts
      const receiptsMap = {};
      sorted.forEach(msg => {
        if (msg.readBy) receiptsMap[msg.id] = { readBy: msg.readBy, count: msg.readCount };
      });
      setReadReceipts(receiptsMap);
      setLoadingHistory(false);
      setHistoryLoaded(true);
      shouldAutoScrollRef.current = true;
      setMessageBuffer((buffer) => {
        if (buffer.length === 0) return [];
        const merged = mergeMessages(sorted, buffer);
        setMessages(merged);
        setReactions((prev) => mergeReactionMaps({ ...buildReactionsMap(sorted), ...prev }, buffer));
        return [];
      });
    };

    const onReceiveMessage = (data) => {
      if (!historyLoaded) {
        setMessageBuffer((prev) => [...prev, data]);
        return;
      }
      shouldAutoScrollRef.current = true;
      setMessages((prev) => (prev.some((msg) => msg.id === data.id) ? prev : [...prev, data]));
    };

    const onReceiveImage = (data) => {
      if (!historyLoaded) {
        setMessageBuffer((prev) => [...prev, data]);
        return;
      }
      shouldAutoScrollRef.current = true;
      setMessages((prev) => (prev.some((msg) => msg.id === data.id) ? prev : [...prev, data]));
      setImgUploading(false);
    };

    const onUpdateUsers = (data) => setUsers(data);
    const onUserTyping = ({ username: typingUser, isTyping }) => setTyping(isTyping ? typingUser : "");

    const onUpdateReaction = ({ msgId, emoji }) => {
      setReactions((prev) => {
        const current = prev[msgId] || {};
        return {
          ...prev,
          [msgId]: {
            ...current,
            [emoji]: (current[emoji] || 0) + 1,
          },
        };
      });
    };

    const onImageError = ({ message: errorMessage }) => {
      setImgUploading(false);
      showToast(errorMessage || "Image upload failed.", "error");
    };

    const onMessageDeleted = ({ msgId }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== msgId));
      setReactions((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      setHighlightedMessageId((prev) => (prev === msgId ? "" : prev));
      setEditingMessageId((prev) => (prev === msgId ? "" : prev));
      setEditingDraft("");
      setEditSaving(false);
    };

    const onDeleteError = ({ message: errorMessage }) => {
      showToast(`Delete failed: ${errorMessage}`, "error");
    };

    const onMessageEdited = ({ msgId, message, edited, editedAt }) => {
      setMessages((prev) => prev.map((msg) => (
        msg.id === msgId
          ? { ...msg, message, edited, editedAt }
          : msg
      )));
      setEditingMessageId((prev) => (prev === msgId ? "" : prev));
      setEditingDraft("");
      setEditSaving(false);
    };

    const onEditError = ({ message: errorMessage }) => {
      setEditSaving(false);
      showToast(errorMessage || "Could not edit that message.", "error");
    };

    const onMessageContext = ({ anchorId, messages: contextMessages, position }) => {
      shouldAutoScrollRef.current = false;
      pendingScrollTargetRef.current = anchorId;
      setHighlightedMessageId(anchorId);
      setMessages((prev) => mergeMessages(prev, contextMessages));
      setReactions((prev) => mergeReactionMaps(prev, contextMessages));
      showToast(`Jumped to result #${position} in this room.`);
      setSearchFocused(false);
    };

    const onMessageContextError = ({ message: errorMessage }) => {
      showToast(errorMessage || "Could not load the selected message.", "error");
    };

    // Pin listeners
    const onPinnedMessagesList = (pinnedList) => {
      setPinnedMessages(pinnedList);
    };
    const onMessagePinned = ({ message, pinnedCount }) => {
      setPinnedMessages(prev => [message, ...prev]);
      showToast(`Message pinned (${pinnedCount}/5)`);
    };
    const onMessageUnpinned = ({ msgId, pinnedCount }) => {
      setPinnedMessages(prev => prev.filter(m => m.id !== msgId));
      showToast(`Message unpinned (${pinnedCount}/5)`);
    };

    // Read receipts listener
    const onReceiptsUpdated = ({ msgId, readBy, count }) => {
      setReadReceipts(prev => ({
        ...prev,
        [msgId]: { readBy, count }
      }));
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
    socket.on("message_edited", onMessageEdited);
    socket.on("edit_error", onEditError);
    socket.on("message_context", onMessageContext);
    socket.on("message_context_error", onMessageContextError);
    socket.on("pinned_messages_list", onPinnedMessagesList);
    socket.on("message_pinned", onMessagePinned);
    socket.on("message_unpinned", onMessageUnpinned);
    socket.on("receipts_updated", onReceiptsUpdated);

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
      socket.off("message_edited", onMessageEdited);
      socket.off("edit_error", onEditError);
      socket.off("message_context", onMessageContext);
      socket.off("message_context_error", onMessageContextError);
      socket.off("pinned_messages_list", onPinnedMessagesList);
      socket.off("message_pinned", onMessagePinned);
      socket.off("message_unpinned", onMessageUnpinned);
      socket.off("receipts_updated", onReceiptsUpdated);
    };
  }, [historyLoaded, onLeave, roomId, token, username]);

  // Intersection Observer for read receipts
  useEffect(() => {
    if (!messagesAreaRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const msgId = entry.target.getAttribute("data-msg-id");
            if (msgId && !readReceipts[msgId]?.readBy?.includes(username)) {
              socket.emit("message_read", { room: roomId, msgId, username });
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const msgElements = document.querySelectorAll(".msg-row");
    msgElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [messages, roomId, username, readReceipts]);

  useEffect(() => {
    const targetId = pendingScrollTargetRef.current;
    if (targetId) {
      const node = messageRefs.current.get(targetId);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        pendingScrollTargetRef.current = null;
      }
      return;
    }

    if (shouldAutoScrollRef.current) {
      endRef.current?.scrollIntoView({ behavior: historyLoaded ? "smooth" : "auto" });
      shouldAutoScrollRef.current = false;
    }
  }, [historyLoaded, messages]);

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      showToast("Invite link copied. Share it with your room.");
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      showToast("Could not copy the link. Please copy it manually.", "error");
    }
  };

  const sendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    shouldAutoScrollRef.current = true;
    socket.emit("send_message", {
      room: roomId,
      message: trimmed,
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
      shouldAutoScrollRef.current = true;
      socket.emit("send_image", {
        room: roomId,
        imageBase64: reader.result,
        sender: username,
        timestamp: new Date().toISOString(),
      });
      setImage(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.onerror = () => {
      setImgUploading(false);
      showToast("Could not read that image file.", "error");
    };
    reader.readAsDataURL(image);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleTyping = () => {
    socket.emit("typing_start", { room: roomId, username });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("typing_stop", { room: roomId });
    }, 1200);
  };

  const addReaction = (msgId, emoji) => {
    socket.emit("message_reaction", { room: roomId, msgId, emoji, username });
    setActivePicker(null);
    closeContextMenu();
  };

  const insertEmoji = (emoji) => {
    setMessage((current) => current + emoji);
    inputRef.current?.focus();
  };

  const saveEditedMessage = () => {
    const trimmedDraft = editingDraft.trim();
    if (!editingMessageId) return;
    if (!trimmedDraft) {
      showToast("Edited message cannot be empty.", "error");
      return;
    }

    const currentMessage = messages.find((msg) => msg.id === editingMessageId);
    if (!currentMessage) {
      showToast("Message not found.", "error");
      cancelEditingMessage();
      return;
    }

    if (!isEditableMessage(currentMessage, username)) {
      showToast("Editing is only allowed within 5 minutes.", "error");
      cancelEditingMessage();
      return;
    }

    if (trimmedDraft === currentMessage.message) {
      cancelEditingMessage();
      return;
    }

    setEditSaving(true);
    socket.emit("edit_message", {
      room: roomId,
      msgId: editingMessageId,
      newMessage: trimmedDraft,
      sender: username,
    });
  };

  const runSearch = async (rawValue = searchQuery) => {
    const query = rawValue.trim();
    setSearchQuery(query);
    setSearchError("");

    if (!query) {
      setSearchFocused(false);
      setSearchResults([]);
      return;
    }

    setSearchFocused(true);
    setSearchLoading(true);

    try {
      const url = new URL(`${API_BASE}/api/search`);
      url.searchParams.set("token", token);
      url.searchParams.set("roomId", roomId);
      url.searchParams.set("q", query);

      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Search failed.");
      }

      setSearchResults(data.results || []);
      setActiveSearchTerm(query);
    } catch (error) {
      setSearchError(error.message || "Search failed.");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setSearchFocused(false);
    setActiveSearchTerm("");
    setHighlightedMessageId("");
  };

  const jumpToSearchResult = (result) => {
    const term = searchQuery.trim();
    setActiveSearchTerm(term);
    setHighlightedMessageId(result.id);
    setSearchFocused(false);

    const existingNode = messageRefs.current.get(result.id);
    if (existingNode) {
      existingNode.scrollIntoView({ behavior: "smooth", block: "center" });
      showToast(`Jumped to "${term}" in chat.`);
      return;
    }

    pendingScrollTargetRef.current = result.id;
    socket.emit("load_message_context", { token, messageId: result.id });
  };

  const dismissSearchContext = () => {
    setActiveSearchTerm("");
    setHighlightedMessageId("");
  };

  const setMessageRef = (messageId, node) => {
    if (!messageId) return;
    if (node) {
      messageRefs.current.set(messageId, node);
    } else {
      messageRefs.current.delete(messageId);
    }
  };

  const showSearchPanel =
    searchLoading ||
    !!searchError ||
    (searchFocused && searchQuery.trim().length > 0) ||
    searchResults.length > 0;
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <div className="chat-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="sidebar-logo">
            <div className="logo-dot" />
            NexChat
          </div>
          <button className="mobile-menu-close" onClick={() => setSidebarOpen(false)} type="button" aria-label="Close sidebar">
            ×
          </button>
        </div>

        <div className="room-badge">
          <span>🔒</span>#{displayRoom}
        </div>
        <div className="private-badge">✦ Private chat</div>

        <div className="users-section">
          <div className="section-label">Members - {users.length}</div>
          {users.map((user, index) => (
            <div key={user.id} className="user-item" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="online-ring">
                <div className="avatar" style={getAvatarStyle(user.username)}>
                  {initials(user.username)}
                </div>
              </div>
              <span className="user-name">{user.username}</span>
              {user.id === mySocketId ? <span className="you-tag">you</span> : null}
            </div>
          ))}
        </div>

        <div className="pins-section">
          <div className="pins-header" onClick={() => setPinsOpen(!pinsOpen)}>
            <span>📌 Pinned Messages ({pinnedMessages.length}/5)</span>
            <span className="pins-toggle">{pinsOpen ? "−" : "+"}</span>
          </div>
          {pinsOpen && (
            <div className="pins-list">
              {pinnedMessages.length === 0 ? (
                <div className="pins-empty">No pinned messages yet.</div>
              ) : (
                pinnedMessages.map(msg => (
                  <div
                    key={msg.id}
                    className="pin-item"
                    onClick={() => {
                      const node = messageRefs.current.get(msg.id);
                      if (node) {
                        node.scrollIntoView({ behavior: "smooth", block: "center" });
                        node.classList.add("targeted");
                        setTimeout(() => node.classList.remove("targeted"), 1500);
                      } else {
                        pendingScrollTargetRef.current = msg.id;
                        socket.emit("load_message_context", { token, messageId: msg.id });
                      }
                    }}
                  >
                    <div className="pin-sender">{msg.sender}</div>
                    <div className="pin-snippet">
                      {msg.type === "text" ? msg.message.slice(0, 60) : "📷 Image"}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="my-info">
            {clerkUser?.imageUrl ? (
              <img src={clerkUser.imageUrl} alt="" style={{ width: 38, height: 38, borderRadius: 11, objectFit: "cover" }} />
            ) : (
              <div className="avatar" style={{ ...getAvatarStyle(username), width: 38, height: 38, borderRadius: 11, fontSize: 14 }}>
                {initials(username)}
              </div>
            )}
            <div>
              <div className="my-name">{username}</div>
              <div className="my-status">● Active</div>
            </div>
          </div>
          <SignOutButton>
            <button className="sidebar-signout">Sign out</button>
          </SignOutButton>
        </div>
      </aside>

      <main className="chat-main">
        <div className="chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} type="button" aria-label="Open sidebar">
              ☰
            </button>
            <div style={{ minWidth: 0 }}>
              <div className="room-name">🔒 Private Chat</div>
              <div className="room-subtitle">#{displayRoom} · Only invited members can see this</div>
            </div>
          </div>

          <div className="header-meta">
            <div className="header-search-shell" ref={searchShellRef}>
              <form
                className="header-search-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  runSearch(searchQuery);
                }}
              >
                <span className="header-search-icon">🔎</span>
                <input
                  ref={searchInputRef}
                  className="header-search-input"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setSearchQuery(nextValue);
                    setSearchError("");
                    if (!nextValue.trim()) {
                      setSearchResults([]);
                      setSearchFocused(false);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      clearSearch();
                    }
                  }}
                  placeholder="Search this room..."
                />
                <button className="header-search-submit" type="submit" disabled={!searchQuery.trim() || searchLoading}>
                  {searchLoading ? "..." : "Search"}
                </button>
                <button className="header-search-clear" type="button" onClick={clearSearch} disabled={!searchQuery && !searchResults.length}>
                  Clear
                </button>
              </form>

              {showSearchPanel ? (
                <div className="search-inline-panel">
                  <div className="search-panel-status">
                    <span className="search-panel-pill">
                      #{displayRoom}
                    </span>
                    {searchResults.length > 0 && !searchLoading ? (
                      <span>{searchResults.length} result{searchResults.length === 1 ? "" : "s"}</span>
                    ) : null}
                  </div>

                  {searchError ? <div className="search-error">{searchError}</div> : null}

                  <div className="search-results">
                    {searchLoading ? (
                      <div className="search-loading">
                        <span className="spin-icon">⏳</span>
                        Searching room history...
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          className="search-result"
                          onClick={() => jumpToSearchResult(result)}
                        >
                          <div className="search-result-top">
                            <span className="search-result-sender">{result.sender}</span>
                            <span>{formatSearchTime(result.timestamp)}</span>
                          </div>
                          <div className="search-result-text">{highlightText(result.message, searchQuery)}</div>
                        </button>
                      ))
                    ) : hasSearchQuery ? (
                      <div className="search-empty">
                        <div className="search-empty-title">No matches</div>
                        <div className="search-empty-copy">
                          Try a simpler keyword, part of a link, or fewer words.
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="member-count">
              <div className="status-dot" />
              <span>{users.length}</span>
              <span className="label">{users.length === 1 ? "member" : "members"}</span>
            </div>
            <button className={`copy-link-btn${linkCopied ? " copied" : ""}`} onClick={copyInviteLink} type="button">
              {linkCopied ? "✓" : "🔗"}
              <span>Invite</span>
            </button>
          </div>
        </div>

        <div className="messages-area" ref={messagesAreaRef}>
          {loadingHistory ? (
            <div className="history-loading">
              <span className="spin-icon">⏳</span>
              Loading message history...
            </div>
          ) : (
            <>
              <div className="date-divider">PRIVATE CHAT · #{displayRoom}</div>

              {activeSearchTerm && highlightedMessageId ? (
                <div className="search-context-bar">
                  <div>
                    Showing search context for <strong>"{activeSearchTerm}"</strong>.
                  </div>
                  <button type="button" className="jump-badge" onClick={dismissSearchContext}>
                    Clear highlight
                  </button>
                </div>
              ) : null}

              {messages.map((msg, index) => {
                const isOwn = msg.sender === username;
                const showAvatar = index === 0 || messages[index - 1]?.sender !== msg.sender;
                const msgReactions = reactions[msg.id] || {};
                const isTargeted = highlightedMessageId === msg.id;
                const isEditingThisMessage = editingMessageId === msg.id;
                const canEditThisMessage = isEditableMessage(msg, username);

                return (
                  <div
                    key={msg.id}
                    className={`msg-row ${isOwn ? "own" : ""}`}
                    ref={(node) => setMessageRef(msg.id, node)}
                    data-msg-id={msg.id}
                  >
                    {!isOwn ? (
                      <div style={{ width: 30, flexShrink: 0 }}>
                        {showAvatar ? (
                          <div className="msg-avatar" style={getAvatarStyle(msg.sender)}>
                            {initials(msg.sender)}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="msg-content">
                      {showAvatar && !isOwn ? <div className="msg-sender">{msg.sender}</div> : null}

                      <div style={{ position: "relative" }}>
                        {isEditingThisMessage ? (
                          <div className="message-edit-box">
                            <textarea
                              className="message-edit-input"
                              value={editingDraft}
                              onChange={(event) => setEditingDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  cancelEditingMessage();
                                }
                                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                                  event.preventDefault();
                                  saveEditedMessage();
                                }
                              }}
                              placeholder="Edit your message..."
                            />
                            <div className="message-edit-actions">
                              <button
                                type="button"
                                className="message-edit-btn"
                                onClick={cancelEditingMessage}
                                disabled={editSaving}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="message-edit-btn primary"
                                onClick={saveEditedMessage}
                                disabled={editSaving || !editingDraft.trim()}
                              >
                                {editSaving ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`msg-bubble ${isOwn ? "own" : "other"}${isTargeted ? " targeted" : ""}`}
                            onContextMenu={(event) => handleContextMenu(event, msg.id, msg.sender)}
                            onDoubleClick={() => setActivePicker((current) => (current === msg.id ? null : msg.id))}
                            style={{ cursor: "pointer" }}
                            title="Right-click for actions or double-click to react"
                          >
                            {msg.type === "image" ? (
                              <>
                                <img
                                  className="msg-img"
                                  src={msg.imageUrl}
                                  alt="shared"
                                  onClick={() => setLightbox(msg.imageUrl)}
                                  onContextMenu={(event) => handleContextMenu(event, msg.id, msg.sender)}
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                    const nextNode = event.currentTarget.nextElementSibling;
                                    if (nextNode) nextNode.style.display = "block";
                                  }}
                                />
                                <span style={{ display: "none", color: "var(--rose)", fontSize: 12 }}>[Image failed to load]</span>
                              </>
                            ) : (
                              activeSearchTerm && isTargeted
                                ? highlightText(msg.message, activeSearchTerm, true)
                                : msg.message
                            )}
                          </div>
                        )}

                        {activePicker === msg.id ? (
                          <div className="reaction-picker">
                            {REACTIONS.map((emoji) => (
                              <span key={emoji} className="reaction-opt" onClick={() => addReaction(msg.id, emoji)}>
                                {emoji}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {Object.keys(msgReactions).length > 0 ? (
                        <div className="msg-reactions">
                          {Object.entries(msgReactions).map(([emoji, count]) => (
                            <div key={emoji} className="reaction-chip" onClick={() => addReaction(msg.id, emoji)}>
                              {emoji}
                              <span>{count}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="msg-time">
                        {formatTime(msg.timestamp)}
                        {msg.edited ? <span className="edited-tag">(edited)</span> : null}
                        {isOwn && readReceipts[msg.id] && readReceipts[msg.id].count > 0 && (
                          <div className="read-receipt" title={readReceipts[msg.id].readBy.join(", ")}>
                            {readReceipts[msg.id].count === 1 ? "✓ Seen" : `✓ Seen by ${readReceipts[msg.id].count}`}
                          </div>
                        )}
                      </div>
                    </div>

                    {isOwn ? <div style={{ width: 30, flexShrink: 0 }} /> : null}
                  </div>
                );
              })}
            </>
          )}

          <div ref={endRef} />
        </div>

        {contextMenu.visible ? (
          <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <div className="reaction-row">
              {REACTIONS.map((emoji) => (
                <span key={emoji} className="reaction-opt" onClick={() => addReaction(contextMenu.msgId, emoji)}>
                  {emoji}
                </span>
              ))}
            </div>
            {contextMenu.sender === username ? (
              <>
                <div className="context-menu-divider" />
                {contextMenu.type === "text" && isEditableMessage(messages.find((msg) => msg.id === contextMenu.msgId), username) ? (
                  <div className="context-menu-item" onClick={beginEditingMessage}>
                    Edit message
                  </div>
                ) : null}
                <div className="context-menu-item" onClick={deleteMessage}>
                  Delete message
                </div>
                <div className="context-menu-item" onClick={() => {
                  socket.emit("pin_message", { room: roomId, msgId: contextMenu.msgId, username });
                  closeContextMenu();
                }}>
                  📌 Pin message
                </div>
                {pinnedMessages.some(m => m.id === contextMenu.msgId) && (
                  <div className="context-menu-item" onClick={() => {
                    socket.emit("unpin_message", { room: roomId, msgId: contextMenu.msgId, username });
                    closeContextMenu();
                  }}>
                    📌 Unpin
                  </div>
                )}
              </>
            ) : null}
          </div>
        ) : null}

        <div className="typing-bar">
          {typing ? (
            <>
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
              {typing} is typing...
            </>
          ) : null}
        </div>

        <div className="input-bar" style={{ position: "relative" }}>
          {imgUploading ? (
            <div className="uploading-indicator">
              <span className="spin-icon">⏳</span>
              Uploading image...
            </div>
          ) : null}

          {imagePreview && !imgUploading ? (
            <div className="image-preview">
              <img className="preview-thumb" src={imagePreview} alt="preview" />
              <span className="preview-name">{image?.name}</span>
              <div className="preview-remove" onClick={clearSelectedImage}>
                ×
              </div>
              <button className="icon-btn accent" onClick={sendImage} type="button" style={{ width: 36, height: 36 }}>
                ↑
              </button>
            </div>
          ) : null}

          <div className="input-row">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            <button className="icon-btn" type="button" onClick={() => fileRef.current?.click()} disabled={imgUploading} title="Attach image">
              📎
            </button>
            <textarea
              ref={inputRef}
              className="msg-input"
              rows={1}
              value={message}
              placeholder="Message your private group..."
              onChange={(event) => {
                setMessage(event.target.value);
                handleTyping();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              style={{ height: "42px", lineHeight: "18px", paddingTop: "12px" }}
            />
            <button className="icon-btn" type="button" onClick={() => setShowEmoji((current) => !current)} title="Emoji">
              😊
            </button>
            <button className="icon-btn accent" type="button" onClick={sendMessage} title="Send">
              ➤
            </button>
          </div>

          {showEmoji ? (
            <div className="emoji-picker">
              {EMOJI_PANEL.map((emoji) => (
                <span key={emoji} className="emoji-btn" onClick={() => insertEmoji(emoji)}>
                  {emoji}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </main>

      {lightbox ? (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="full view" />
        </div>
      ) : null}

      {toast ? <div className={`toast ${toastType === "error" ? "error" : ""}`}>{toast}</div> : null}
    </div>
  );
};

const Chat = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const [token, setToken] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setToken(urlToken);
      try {
        sessionStorage.setItem("nexchat_token", urlToken);
      } catch {}
    } else {
      try {
        const savedToken = sessionStorage.getItem("nexchat_token");
        if (savedToken) setToken(savedToken);
      } catch {}
    }
  }, []);

  const displayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "User";

  if (!isLoaded) {
    return (
      <div className="clerk-wrapper">
        <div style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="spin-icon">⏳</span>
          Loading...
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="clerk-wrapper">
        <SignIn />
      </div>
    );
  }

  if (!joined) {
    return (
      <PrivateJoinScreen
        clerkUser={user}
        initialToken={token}
        onJoin={(nextToken, nextRoomId) => {
          setToken(nextToken);
          setRoomId(nextRoomId);
          setJoined(true);
          try {
            sessionStorage.setItem("nexchat_token", nextToken);
          } catch {}
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
        setJoined(false);
        setToken(null);
        setRoomId(null);
        try {
          sessionStorage.removeItem("nexchat_token");
        } catch {}
      }}
    />
  );
};

export default Chat;