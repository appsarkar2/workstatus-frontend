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
  // Start the idle timer immediately upon successful login
  if (typeof resetIdleTimer === "function") resetIdleTimer();
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

// ═══════════════════════════════════════════════════════════════
// 5-MINUTE IDLE TIMEOUT LOGIC
// Saves Render server hours by logging out inactive sessions.
// ═══════════════════════════════════════════════════════════════

let idleTimer;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 Minutes

function resetIdleTimer() {
  // Only run if user is logged in and not on login page
  if (!getToken() || isOnLoginPage()) return;

  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (getToken()) {
      // Use your built-in toast if available, otherwise alert
      if (typeof showToast === "function") {
        showToast("Session expired: 5 minutes of inactivity.", "error");
      } else {
        alert("Session expired: 5 minutes of inactivity.");
      }
      
      // Wait 2 seconds so they can read the message, then logout
      setTimeout(() => { 
        logout(); 
      }, 2000); 
    }
  }, IDLE_TIMEOUT_MS);
}

// Listen for user activity on all pages
if (typeof window !== "undefined") {
  window.addEventListener("mousemove", resetIdleTimer);
  window.addEventListener("keydown", resetIdleTimer);
  window.addEventListener("click", resetIdleTimer);
  window.addEventListener("scroll", resetIdleTimer);
  window.addEventListener("touchstart", resetIdleTimer);
}

// Handle browser tab switching (prevents background tabs from sleeping inaccurately)
let lastActivityTime = Date.now();
window.addEventListener("mousemove", () => { lastActivityTime = Date.now(); });
window.addEventListener("keydown", () => { lastActivityTime = Date.now(); });

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    const timeAway = Date.now() - lastActivityTime;
    if (timeAway > IDLE_TIMEOUT_MS && getToken()) {
      if (typeof showToast === "function") {
        showToast("Session expired: 5 minutes of inactivity.", "error");
      }
      setTimeout(() => { logout(); }, 2000);
    }
  }
});

// Auto-run on load (every page that includes this file gets protected).
requireAuth();

// Initialize the timer on page load if the user is already logged in
if (getToken() && !isOnLoginPage()) {
  resetIdleTimer();
}