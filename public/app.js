const form = document.getElementById("user-form");
const statusEl = document.getElementById("status");
const rowsEl = document.getElementById("rows");
const refreshBtn = document.getElementById("refresh");

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = `status ${kind ?? ""}`;
}

async function loadUsers() {
  const res = await fetch("/api/users");
  if (res.status === 401) {
    window.location.href = "/";
    return;
  }
  const data = await res.json();
  if (!res.ok) {
    rowsEl.innerHTML = `<tr><td colspan="4" class="empty">${data.error ?? "Could not load rows"}</td></tr>`;
    return;
  }
  if (!data.users.length) {
    rowsEl.innerHTML = `<tr><td colspan="4" class="empty">No rows yet</td></tr>`;
    return;
  }
  rowsEl.innerHTML = data.users
    .map(
      (user) => `
        <tr>
          <td>${user.id}</td>
          <td>${escapeHtml(user.user_name ?? "")}</td>
          <td>${user.dob ?? ""}</td>
          <td>${user.mobile_no ?? ""}</td>
        </tr>
      `
    )
    .join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(form));
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  setStatus("Saving…");
  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Could not save", "err");
      return;
    }
    form.reset();
    setStatus(`Saved ${data.user.user_name} (id ${data.user.id})`, "ok");
    await loadUsers();
  } catch {
    setStatus("Network error", "err");
  } finally {
    button.disabled = false;
  }
});

refreshBtn.addEventListener("click", () => {
  loadUsers().catch(() => setStatus("Could not refresh", "err"));
});

loadUsers().catch(() => setStatus("Could not load existing rows", "err"));
