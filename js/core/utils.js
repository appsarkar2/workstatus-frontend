// ═══════════════════════════════════════════════════════════════
// WorkStatus — Utils
// Small helper functions used across the app.
// ═══════════════════════════════════════════════════════════════

/**
 * Format an ISO date string as "05 Oct 2026" (en-IN style).
 */
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a date-time as "05 Oct 2026, 3:45 PM".
 */
function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Human-friendly relative time: "just now", "5m ago", "3h ago", "2d ago".
 */
function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Escape HTML special characters to prevent XSS when injecting into innerHTML.
 */
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

/**
 * Capitalize the first letter of a string.
 */
function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Format a status string for display: "in_progress" -> "In Progress".
 */
function formatStatus(s) {
  if (!s) return "";
  return s
    .split("_")
    .map((w) => capitalize(w))
    .join(" ");
}