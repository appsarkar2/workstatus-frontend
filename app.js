// Backend URL — localhost for now, will change to Koyeb later
const API_BASE = "https://workstatus-api.onrender.com";

const form = document.getElementById("loginForm");
const msg = document.getElementById("message");
const btn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";
  msg.className = "message";
  btn.disabled = true;
  btn.textContent = "Signing in...";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Login failed");
    }

    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));

    msg.textContent = `Welcome, ${data.user.name}!`;
    msg.className = "message success";

    setTimeout(() => {
      window.location.href = "/dashboard.html";
    }, 600);
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "message error";
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign In";
  }
});