(() => {
  "use strict";

  const storageKey = "mbvTheme";
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const themes = ["system", "light", "dark"];
  const icons = {
    system: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8m-4-4v4"></path></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"></path></svg>'
  };
  const labels = {
    system: "Tema do sistema",
    light: "Tema claro",
    dark: "Tema escuro"
  };
  let mode = "system";
  let picker;
  let menu;

  try {
    const savedMode = localStorage.getItem(storageKey);
    if (themes.includes(savedMode)) mode = savedMode;
  } catch (_) {
    // O tema do sistema continua disponível quando o armazenamento está bloqueado.
  }

  function applyTheme() {
    const isDark = mode === "dark" || (mode === "system" && mediaQuery.matches);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
      meta.content = isDark ? "#17151B" : "#F8F7F2";
    });
    if (!picker) return;

    const currentIcon = picker.querySelector(".theme-current-icon");
    const currentLabel = picker.querySelector(".theme-current-label");
    currentIcon.innerHTML = icons[mode];
    currentLabel.textContent = mode === "system" ? "Sistema" : mode === "light" ? "Claro" : "Escuro";
    picker.querySelector(".theme-trigger").setAttribute("aria-label", `Tema atual: ${labels[mode]}`);
    picker.querySelectorAll("[data-theme-choice]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.themeChoice === mode));
    });
  }

  applyTheme();
  mediaQuery.addEventListener("change", () => {
    if (mode === "system") applyTheme();
  });

  function createIcon(markup) {
    const wrapper = document.createElement("span");
    wrapper.className = "theme-option-icon";
    wrapper.innerHTML = markup;
    return wrapper;
  }

  function createPicker() {
    picker = document.createElement("div");
    picker.className = "theme-picker";
    picker.innerHTML = `
      <button class="theme-trigger" type="button" aria-haspopup="true" aria-expanded="false">
        <span class="theme-current-icon"></span>
        <span class="theme-current-label"></span>
        <svg class="theme-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"></path></svg>
      </button>
    `;

    const trigger = picker.querySelector(".theme-trigger");
    menu = document.createElement("div");
    menu.className = "theme-menu";
    menu.setAttribute("role", "group");
    menu.setAttribute("aria-label", "Escolher aparência");
    menu.hidden = true;

    themes.forEach(theme => {
      const option = document.createElement("button");
      option.className = "theme-option";
      option.type = "button";
      option.dataset.themeChoice = theme;
      option.append(createIcon(icons[theme]), document.createTextNode(labels[theme]));
      option.addEventListener("click", () => {
        mode = theme;
        try {
          localStorage.setItem(storageKey, mode);
        } catch (_) {
          // A escolha continua aplicada até a página ser fechada.
        }
        applyTheme();
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      });
      menu.append(option);
    });

    trigger.addEventListener("click", () => {
      menu.hidden = !menu.hidden;
      trigger.setAttribute("aria-expanded", String(!menu.hidden));
      if (!menu.hidden) menu.querySelector(`[data-theme-choice="${mode}"]`).focus();
    });
    picker.append(menu);

    document.addEventListener("click", event => {
      if (!picker.contains(event.target) && !menu.hidden) {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    picker.addEventListener("keydown", event => {
      if (event.key === "Escape" && !menu.hidden) {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      }
    });

    const navActions = document.querySelector(".nav-actions");
    const cartButton = document.getElementById("openCart");
    const headerActions = document.querySelector(".admin-header-actions");
    const header = document.querySelector(".admin-header");
    const pageContainer = document.querySelector(".login-container, .register-container");

    if (navActions && cartButton) {
      navActions.insertBefore(picker, cartButton);
    } else if (headerActions) {
      headerActions.append(picker);
    } else if (header) {
      header.append(picker);
    } else if (pageContainer) {
      pageContainer.insertBefore(picker, pageContainer.firstChild);
    }

    applyTheme();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createPicker, { once: true });
  } else {
    createPicker();
  }
})();
