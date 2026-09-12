async function me() {
  const res = await fetch("/api/me");
  if (!res.ok) {
    window.location.href = "/";
    return null;
  }
  return res.json();
}

const claimBox = document.getElementById("claim-box");
const publishBox = document.getElementById("publish-box");
const mineEl = document.getElementById("mine");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showFaculty() {
  claimBox.hidden = true;
  publishBox.hidden = false;
  loadMine();
}

async function loadMine() {
  const res = await fetch("/api/materials?mine=1");
  const data = await res.json();
  if (!res.ok) {
    mineEl.textContent = data.error ?? "Could not load";
    return;
  }
  const rows = data.materials ?? [];
  if (!rows.length) {
    mineEl.innerHTML = `<p class="empty">Nothing published yet.</p>`;
    return;
  }
  mineEl.innerHTML = rows
    .map(
      (row) => `
        <article class="ncert-card" data-material-id="${row.id}">
          <h4>${escapeHtml(row.title)}</h4>
          <p class="meta">${escapeHtml(row.subject)}${row.class_tag ? ` · ${escapeHtml(row.class_tag)}` : ""} · ${new Date(row.created_at).toLocaleString("en-IN")}${row.published ? " · live on student pages" : " · unpublished"}</p>
          <button type="button" class="ghost danger-btn" data-delete-material="${row.id}">Delete from site</button>
        </article>`
    )
    .join("");
}

async function deleteMaterial(id) {
  const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? "Could not delete");
  }
}

document.getElementById("claim-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = new FormData(event.target).get("code");
  const res = await fetch("/api/faculty/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  const status = document.getElementById("claim-status");
  if (!res.ok) {
    status.textContent = data.error ?? "Failed";
    return;
  }
  showFaculty();
});

document.getElementById("pub-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const payload = Object.fromEntries(new FormData(form));
  const res = await fetch("/api/materials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  const status = document.getElementById("pub-status");
  if (!res.ok) {
    status.textContent = data.error ?? "Failed";
    return;
  }
  status.textContent = "Published to the student section.";
  form.reset();
  loadMine();
});

mineEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-material]");
  if (!button) return;
  const id = button.dataset.deleteMaterial;
  const card = button.closest("[data-material-id]");
  const title = card?.querySelector("h4")?.textContent ?? "this note";
  if (!window.confirm(`Delete “${title}”? Students will no longer see it.`)) return;
  button.disabled = true;
  try {
    await deleteMaterial(id);
    await loadMine();
    const status = document.getElementById("pub-status");
    status.textContent = "Removed from the student section.";
  } catch (err) {
    button.disabled = false;
    window.alert(err instanceof Error ? err.message : "Could not delete");
  }
});

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/";
});

(async () => {
  const session = await me();
  if (!session) return;
  if (session.account.role === "faculty") showFaculty();
})();
