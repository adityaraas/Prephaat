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
  mineEl.innerHTML = (data.materials ?? [])
    .map(
      (row) =>
        `<p class="meta"><strong>${row.title}</strong> · ${row.subject} · ${new Date(row.created_at).toLocaleString("en-IN")}</p>`
    )
    .join("") || `<p class="empty">Nothing published yet.</p>`;
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

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/";
});

(async () => {
  const session = await me();
  if (!session) return;
  if (session.account.role === "faculty") showFaculty();
})();
