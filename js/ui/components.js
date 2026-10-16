// ═══════════════════════════════════════════════════════════════
// WorkStatus — UI Components
// Reusable HTML template functions. Return HTML strings.
// Requires: utils.js (escapeHtml)
// ═══════════════════════════════════════════════════════════════

// ---------- Chrome (page shells) ----------

/**
 * App header with logo, optional back button, and right-side icons.
 * @param {Object} opts
 * @param {string} opts.title              - Header title (required)
 * @param {boolean} [opts.back]            - Show back button
 * @param {string} [opts.backUrl]          - Where back button goes
 * @param {string} [opts.backOnClick]      - Custom onClick (overrides backUrl)
 * @param {Array<{icon:string,onClick:string,title:string}>} [opts.actions] - Right-side buttons
 */
function header(opts = {}) {
  const left = `
    <div class="header-left">
      ${opts.back ? `<button class="icon-btn" onclick="${opts.backOnClick || `location.href='${opts.backUrl || "/dashboard.html"}'`}">←</button>` : ""}
      <div class="logo">${escapeHtml(opts.title || "WorkStatus")}</div>
    </div>
  `;

  const actions = (opts.actions || [])
    .map(a => `<button class="icon-btn" title="${escapeHtml(a.title || "")}" onclick="${a.onClick}">${a.icon}</button>`)
    .join("");

  return `
    <header class="app-header">
      ${left}
      <div class="header-right">${actions}</div>
    </header>
  `;
}

/**
 * Bottom navigation bar.
 * @param {string} active - One of: "blocks", "reports", "home", "uploads", "logout"
 */
function bottomNav(active) {
  const items = [
    { id: "blocks",  icon: "📋", label: "Blocks",  href: "/dashboard.html" },
    { id: "reports", icon: "📊", label: "Reports", href: "#" },
    { id: "home",    icon: "🏠", label: "Home",    href: "/dashboard.html" },
    { id: "uploads", icon: "📤", label: "Uploads", href: "#" },
    { id: "logout",  icon: "👤", label: "Logout",  href: "#" },
  ];

  return `
    <nav class="bottom-nav">
      ${items.map(i => {
        const isActive = active === i.id;
        const cls = "nav-item" + (isActive ? " active" : "");
        const iconCls = isActive && i.id === "home" ? "nav-icon active-circle" : "nav-icon";
        const onclick = i.id === "logout"
          ? `onclick="logout()"`
          : (i.href === "#" ? `onclick="showToast('Coming soon','info')"` : `href="${i.href}"`);
        const tag = i.href !== "#" && i.id !== "logout" ? "a" : "a";

        return `
          <${tag} class="${cls}" href="${i.href}" ${onclick}>
            <span class="${iconCls}">${i.icon}</span>
            <span class="nav-label">${i.label}</span>
          </${tag}>
        `;
      }).join("")}
    </nav>
  `;
}

// ---------- Cards ----------

/**
 * Generic card with title and body.
 */
function card(title, body, opts = {}) {
  const cls = opts.className || "detail-card";
  return `
    <section class="${cls}">
      ${title ? `<h2 class="section-title">${escapeHtml(title)}</h2>` : ""}
      ${body || ""}
    </section>
  `;
}

/**
 * Stat grid — a row of stat cards.
 * @param {Array<{label:string, value:any, color?:string}>} items
 */
function statGrid(items = []) {
  const cards = items.map(i => {
    const colorCls = i.color ? `stat-${i.color}` : "";
    return `
      <div class="stat-card ${colorCls}">
        <div class="stat-num">${escapeHtml(String(i.value ?? 0))}</div>
        <div class="stat-label">${escapeHtml(i.label || "")}</div>
      </div>
    `;
  }).join("");
  return `<div class="stats-row">${cards}</div>`;
}

// ---------- Lists ----------

/**
 * Render a list of items using a row template function.
 * @param {Array<any>} items
 * @param {(item,index)=>string} rowFn - Returns HTML for each row
 * @param {string} [emptyMessage] - Shown if items is empty
 */
function list(items = [], rowFn, emptyMessage = "No items") {
  if (!items.length) return emptyState("📭", emptyMessage);
  return `<div class="task-list">${items.map((it, idx) => rowFn(it, idx)).join("")}</div>`;
}

/**
 * A single task-like row (title, sub, badge).
 */
function taskRow({ title, sub, badge, badgeClass, onClick }) {
  return `
    <div class="task-item ${onClick ? "app-card" : ""}" ${onClick ? `onclick="${onClick}"` : ""}>
      <div>
        <div class="task-title">${escapeHtml(title || "")}</div>
        ${sub ? `<div class="task-sub">${escapeHtml(sub)}</div>` : ""}
      </div>
      ${badge ? `<span class="task-badge ${badgeClass || ""}">${escapeHtml(badge)}</span>` : ""}
    </div>
  `;
}

// ---------- Badges ----------

function statusBadge(status) {
  const s = (status || "").toLowerCase();
  const cls = s.includes("complete") ? "completed"
            : s.includes("progress") ? "in_progress"
            : s.includes("reject")   ? "rejected"
            : "pending";
  const icon = cls === "completed" ? "✅"
             : cls === "in_progress" ? "🔄"
             : cls === "rejected"   ? "❌"
             : "⏳";
  return `<span class="task-badge ${cls}">${icon} ${escapeHtml(formatStatus(s))}</span>`;
}

// ---------- Empty state ----------

function emptyState(icon = "📭", title = "Nothing here", sub = "") {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${escapeHtml(title)}</div>
      ${sub ? `<div class="empty-sub">${escapeHtml(sub)}</div>` : ""}
    </div>
  `;
}

// ---------- Floating action button ----------

function fab(icon, onClick, title = "") {
  return `<button class="fab" title="${escapeHtml(title)}" onclick="${onClick}">${icon}</button>`;
}

// ---------- Search ----------

function searchBar(id, placeholder = "Search...") {
  return `
    <section class="search-wrap">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="${id}" placeholder="${escapeHtml(placeholder)}" />
      </div>
    </section>
  `;
}

// ---------- Tables ----------

/**
 * Simple data table.
 * @param {Array<Object>} rows
 * @param {Array<{key:string,label:string,format?:Function}>} columns
 */
function table(rows = [], columns = []) {
  if (!rows.length) return emptyState("📭", "No records");

  const headerHtml = columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join("");
  const bodyHtml = rows.map(row => {
    const cells = columns.map(c => {
      const val = row[c.key];
      const display = c.format ? c.format(val, row) : escapeHtml(String(val ?? "—"));
      return `<td>${display}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="text-align:left;border-bottom:1px solid var(--color-border)">${headerHtml}</tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  `;
}

// ---------- Page loader helper ----------

/**
 * Show a loading state in a container by ID.
 */
function showLoading(elId, message = "Loading...") {
  const el = document.getElementById(elId);
  if (el) {
    el.innerHTML = emptyState("⏳", message);
  }
}

/**
 * Show an error state in a container by ID.
 */
function showError(elId, message) {
  const el = document.getElementById(elId);
  if (el) {
    el.innerHTML = emptyState("⚠️", message || "Something went wrong");
  }
}