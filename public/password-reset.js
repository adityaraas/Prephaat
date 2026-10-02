const form = document.querySelector("#forgot-password-form, #reset-password-form");
const status = document.getElementById("status");
const button = form.querySelector("button[type=submit]");
const isReset = form.id === "reset-password-form";
const token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
if (isReset) history.replaceState(null, "", location.pathname);
function showStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`;
}
if (isReset && !/^[a-f0-9]{64}$/.test(token)) {
  showStatus("This reset link is invalid or missing. Request a new reset link below.", "err");
  button.disabled = true;
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  if (isReset && values.password !== values.confirm) {
    showStatus("Passwords do not match.", "err");
    return;
  }
  button.disabled = true;
  showStatus(isReset ? "Updating password..." : "Requesting reset link...");
  let completed = false;
  try {
    const response = await fetch(isReset ? "/api/reset-password" : "/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isReset ? { token, password: values.password } : { email: values.email }),
    });
    const data = await response.json();
    if (!response.ok) { showStatus(data.error || "Please try again later.", "err"); return; }
    showStatus(data.message, "ok");
    if (isReset) {
      completed = true;
      form.querySelectorAll("input").forEach(input => { input.value = ""; input.disabled = true; });
      button.textContent = "Password updated";
    }
  } catch {
    showStatus("Unable to connect. Please try again.", "err");
  } finally {
    button.disabled = completed;
  }
});
