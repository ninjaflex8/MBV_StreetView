(() => {
  "use strict";

  document.querySelectorAll(".password-toggle").forEach(button => {
    const passwordInput = document.getElementById(button.getAttribute("aria-controls"));
    if (!passwordInput) return;

    button.addEventListener("click", () => {
      const isVisible = passwordInput.type === "password";
      passwordInput.type = isVisible ? "text" : "password";
      button.setAttribute("aria-pressed", String(isVisible));
      button.setAttribute("aria-label", isVisible ? "Ocultar senha" : "Mostrar senha");
    });
  });
})();
