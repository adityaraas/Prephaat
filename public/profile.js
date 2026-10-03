const SiteProfile = (() => {
  const menu = document.getElementById("profile-menu");
  function setAccount(account) {
    const values = { who: account.name, "profile-name": account.name, "profile-email": account.email,
      "profile-detail-email": account.email, "profile-role": account.role === "faculty" ? "Faculty" : "Student",
      "profile-avatar": String(account.name || "My Profile").trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() };
    for (const [id, value] of Object.entries(values)) {
      const element = document.getElementById(id);
      if (element) element.textContent = value || "—";
    }
  }
  document.addEventListener("click", (event) => { if (menu && !menu.contains(event.target)) menu.open = false; });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu?.open) { menu.open = false; menu.querySelector("summary").focus(); }
  });
  document.getElementById("logout")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    const status = document.getElementById("profile-status");
    status.textContent = "";
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      window.location.href = "/";
    } catch { status.textContent = "Could not sign out. Please try again."; button.disabled = false; }
  });
  return { setAccount };
})();
