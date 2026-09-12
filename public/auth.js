const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const statusEl = document.getElementById("status");

const oauthErrors = {
  "google-not-configured": "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable Google sign-in.",
  "google-denied": "Google sign-in was cancelled.",
  "google-failed": "Google sign-in failed. Try again.",
  "google-unverified": "That Google email is not verified.",
};

function setStatus(message, kind) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `status ${kind ?? ""}`;
}

const oauthError = new URLSearchParams(window.location.search).get("error");
if (oauthError) {
  setStatus(oauthErrors[oauthError] ?? "Could not sign in with Google.", "err");
}

document.querySelectorAll("[data-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.parentElement.querySelector("input");
    input.type = input.type === "password" ? "text" : "password";
  });
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(loginForm));
    const button = loginForm.querySelector(".cta");
    button.disabled = true;
    setStatus("Signing in…");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Could not sign in", "err");
        return;
      }
      window.location.href = "/home";
    } catch {
      setStatus("Network error", "err");
    } finally {
      button.disabled = false;
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(signupForm));
    if (payload.password !== payload.confirm) {
      setStatus("Passwords do not match", "err");
      return;
    }
    const button = signupForm.querySelector(".cta");
    button.disabled = true;
    setStatus("Creating account…");
    try {
      const { confirm, ...body } = payload;
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Could not create account", "err");
        return;
      }
      window.location.href = "/home";
    } catch {
      setStatus("Network error", "err");
    } finally {
      button.disabled = false;
    }
  });
}
