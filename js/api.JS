// ═══════════════════════════════════════════════════════════════
// WorkStatus — Shared API Helper
// ═══════════════════════════════════════════════════════════════

const API_BASE = "https://workstatus-api.onrender.com";

// ---------- Auth helpers ----------
function getToken() {
  return localStorage.getItem("token");
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
}

// Redirect to login if no token
if (!getToken()) {
  window.location.href = "/";
}

// ---------- Core fetch wrapper ----------
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    logout();
    throw new Error("Session expired. Please log in again.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ---------- Block APIs ----------
const BlocksAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/blocks/bulk_connection/${query ? "?" + query : ""}`);
  },
  getConfig: () => apiFetch("/api/blocks/bulk_connection/config"),
  getStats: () => apiFetch("/api/blocks/bulk_connection/stats"),
  getOne: (id) => apiFetch(`/api/blocks/bulk_connection/${id}`),
  create: (body) =>
    apiFetch("/api/blocks/bulk_connection/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id, body) =>
    apiFetch(`/api/blocks/bulk_connection/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  updateStage: (id, body) =>
    apiFetch(`/api/blocks/bulk_connection/${id}/stage`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (id) =>
    apiFetch(`/api/blocks/bulk_connection/${id}`, { method: "DELETE" }),
};

// ---------- UI helpers ----------
function showToast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("toast-show"), 10);
  setTimeout(() => {
    el.classList.remove("toast-show");
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}