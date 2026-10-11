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

// Redirect to login if no token (but not if we're already on login page)
if (
  !getToken() &&
  window.location.pathname !== "/" &&
  window.location.pathname !== "/index.html"
) {
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
    // Prevent redirect loop: only redirect if not already on login page
    if (
      window.location.pathname !== "/" &&
      window.location.pathname !== "/index.html"
    ) {
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

// ---------- Block APIs ----------
// Note: Currently hardcoded to bulk_connection. Phase 2 will introduce
// BlockAPI(blockId) factory to support multiple blocks dynamically.
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

// ---------- Registry API (Phase 1) ----------
// Fetch the list of active blocks from the backend (dynamic).
const RegistryAPI = {
  listBlocks: () => apiFetch("/api/blocks"),
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

/**
 * Show a modal prompt. Returns a Promise that resolves with:
 *   - the input string value (may be empty string), or
 *   - null if the user cancelled
 *
 * @param {Object} options
 * @param {string} options.title          - Modal heading (required)
 * @param {string} [options.placeholder]  - Input placeholder
 * @param {string} [options.value]        - Initial input value
 * @param {string} [options.confirmText]  - Confirm button label (default "OK")
 * @param {string} [options.cancelText]   - Cancel button label (default "Cancel")
 * @param {boolean} [options.multiline]   - Use textarea instead of input
 */
function showPrompt(options = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const modal = document.createElement("div");
    modal.className = "modal-box";

    const title = document.createElement("div");
    title.className = "modal-title";
    title.textContent = options.title || "Input";
    modal.appendChild(title);

    const input = document.createElement(
      options.multiline ? "textarea" : "input"
    );
    input.className = "modal-input";
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.value) input.value = options.value;
    if (options.multiline) input.rows = 4;
    modal.appendChild(input);

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-btn modal-btn-cancel";
    cancelBtn.textContent = options.cancelText || "Cancel";
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(null);
    };
    actions.appendChild(cancelBtn);

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "modal-btn modal-btn-confirm";
    confirmBtn.textContent = options.confirmText || "OK";
    confirmBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(input.value);
    };
    actions.appendChild(confirmBtn);

    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => input.focus(), 50);

    // Enter -> confirm (single-line only), Escape -> cancel
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !options.multiline) confirmBtn.click();
      if (e.key === "Escape") cancelBtn.click();
    });

    // Click outside -> cancel
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cancelBtn.click();
    });
  });
}

/**
 * Show a confirm dialog. Returns Promise<boolean>.
 */
function showConfirm(options = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const modal = document.createElement("div");
    modal.className = "modal-box";

    const title = document.createElement("div");
    title.className = "modal-title";
    title.textContent = options.title || "Confirm";
    modal.appendChild(title);

    if (options.message) {
      const msg = document.createElement("div");
      msg.className = "modal-message";
      msg.textContent = options.message;
      modal.appendChild(msg);
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-btn modal-btn-cancel";
    cancelBtn.textContent = options.cancelText || "Cancel";
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };
    actions.appendChild(cancelBtn);

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "modal-btn modal-btn-confirm";
    confirmBtn.textContent = options.confirmText || "Confirm";
    confirmBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };
    actions.appendChild(confirmBtn);

    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => confirmBtn.focus(), 50);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cancelBtn.click();
    });
  });
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