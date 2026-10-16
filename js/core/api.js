// ═══════════════════════════════════════════════════════════════
// WorkStatus — Core API
// Talks to the backend. No UI logic. No modals. No DOM.
// Depends on: auth-guard.js (for getToken, logout, isOnLoginPage)
// ═══════════════════════════════════════════════════════════════

// ---------- Environment detection ----------
// Local dev (localhost / 127.0.0.1 / file://) → local backend
// Anywhere else (Vercel, custom domain)        → production backend
// This lets the same code run in both places with no manual switching.
const _isLocalDev =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1" ||
   window.location.hostname === "0.0.0.0" ||
   window.location.protocol === "file:");

const API_BASE = _isLocalDev
  ? "http://localhost:8000"
  : "https://workstatus-api.onrender.com";

// Debug log — check browser console to see which backend is being used
console.log(`[api] env=${_isLocalDev ? "local" : "prod"} base=${API_BASE}`);

// ---------- Core fetch wrapper ----------
/**
 * Adds JWT auth header, handles 401, parses JSON.
 * Throws an Error with the server's `detail` message on failure.
 */
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
    // Redirect to login (unless already there — prevents loop)
    if (!isOnLoginPage()) {
      logout();
    }
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

// ---------- Auth API ----------
const AuthAPI = {
  login: (username, password) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => apiFetch("/api/auth/me"),
};

// ---------- Registry API ----------
// Fetches the list of active blocks from the backend.
const RegistryAPI = {
  listBlocks: () => apiFetch("/api/blocks"),
};

// ---------- Block API Factory ----------
/**
 * Create an API client for a specific block (e.g. "bulk_connection").
 * Usage:
 *   const api = BlockAPI("bulk_connection");
 *   const items = await api.list();
 *   await api.getOne(id);
 */
function BlockAPI(blockId) {
  const base = `/api/blocks/${blockId}`;
  return {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiFetch(`${base}/${query ? "?" + query : ""}`);
    },
    getConfig: () => apiFetch(`${base}/config`),
    getStats: () => apiFetch(`${base}/stats`),
    getOne: (id) => apiFetch(`${base}/${id}`),
    create: (body) =>
      apiFetch(`${base}/`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id, body) =>
      apiFetch(`${base}/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    updateStage: (id, body) =>
      apiFetch(`${base}/${id}/stage`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id) => apiFetch(`${base}/${id}`, { method: "DELETE" }),
  };
}

// ---------- Backwards-compatible alias ----------
// Existing pages call `BlocksAPI.getOne(...)` etc.
// This keeps them working until we migrate them in Step D.
const BlocksAPI = BlockAPI("bulk_connection");