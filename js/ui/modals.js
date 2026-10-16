// ═══════════════════════════════════════════════════════════════
// WorkStatus — UI Modals
// showPrompt, showConfirm, showToast — replaces native prompt/alert.
// ═══════════════════════════════════════════════════════════════

/**
 * Show a small floating toast notification.
 * @param {string} message
 * @param {"info"|"success"|"error"} type
 */
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
 * Show a modal prompt with a text input.
 * Returns a Promise that resolves with:
 *   - the input string value (may be empty), or
 *   - null if the user cancelled
 *
 * @param {Object} options
 * @param {string} options.title           - Modal heading (required)
 * @param {string} [options.placeholder]   - Input placeholder
 * @param {string} [options.value]         - Initial input value
 * @param {string} [options.confirmText]   - Confirm button label (default "OK")
 * @param {string} [options.cancelText]    - Cancel button label (default "Cancel")
 * @param {boolean} [options.multiline]    - Use textarea instead of input
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

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !options.multiline) confirmBtn.click();
      if (e.key === "Escape") cancelBtn.click();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cancelBtn.click();
    });
  });
}

/**
 * Show a modal confirm dialog.
 * Returns Promise<boolean> — true if user confirmed, false otherwise.
 *
 * @param {Object} options
 * @param {string} options.title          - Modal heading (required)
 * @param {string} [options.message]      - Optional body text
 * @param {string} [options.confirmText]  - Confirm button label (default "Confirm")
 * @param {string} [options.cancelText]   - Cancel button label (default "Cancel")
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