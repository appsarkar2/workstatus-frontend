// ═══════════════════════════════════════════════════════════════
// WorkStatus — Auth Guard
// Handles token storage, retrieval, logout, and redirect logic.
// Loaded on every page. Redirects unauthenticated users to login.
// ═══════════════════════════════════════════════════════════════

/**
 * Get the stored JWT token, or null if not logged in.
 */
function getToken() {
  return localStorage.getItem("token");
}

/**
 * Get the current user object ({username, role, name}).
 * Returns {} if not logged in.
 */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

/**
 * Store the login response (token + user).
 */
function setSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

/**
 * Clear the session and redirect to login page.
 */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
}

/**
 * Check if the user is on the login page.
 */
function isOnLoginPage() {
  const path = window.location.pathname;
  return path === "/" || path === "/index.html";
}

/**
 * Redirect to login if not authenticated.
 * Safe — does nothing if already on login page (prevents loop).
 * Call this on any page that requires login.
 */
function requireAuth() {
  if (!getToken() && !isOnLoginPage()) {
    window.location.href = "/";
    return false;
  }
  return true;
}

// Auto-run on load (every page that includes this file gets protected).
requireAuth();