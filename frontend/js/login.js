(() => {
  "use strict";

  const form = document.getElementById("loginForm");
  if (!form) return;

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginSenha");
  const rememberEmail = document.getElementById("rememberEmail");
  const submitButton = document.getElementById("loginButton");
  const message = document.getElementById("loginMessage");

  function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `message ${type}`;
  }

  try {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      emailInput.value = savedEmail;
      rememberEmail.checked = true;
    }
  } catch {
    showMessage("O navegador não permite lembrar o e-mail neste dispositivo.");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    const senha = passwordInput.value;

    try {
      if (rememberEmail.checked) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
    } catch {
      showMessage("Não foi possível salvar sua preferência de e-mail.");
    }

    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    showMessage("Verificando seus dados...", "success");

    let response;
    try {
      response = await fetch(`${window.MBV_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(window.MBV_API_HEADERS || {})
        },
        body: JSON.stringify({ email, senha })
      });
    } catch {
      showMessage("Não foi possível conectar ao servidor. Confira a API e tente novamente.");
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      return;
    }

    let resultado;
    try {
      resultado = await response.json();
    } catch {
      showMessage("O servidor retornou uma resposta inválida.");
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      return;
    }

    if (!response.ok) {
      showMessage(resultado.message || "Não foi possível entrar.");
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      return;
    }

    if (!resultado.token || !resultado.usuario) {
      showMessage("O servidor não retornou os dados de autenticação esperados.");
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      return;
    }

    try {
      localStorage.setItem("authToken", resultado.token);
      localStorage.setItem("userName", resultado.usuario.nome);
      localStorage.setItem("userEmail", resultado.usuario.email);
    } catch {
      showMessage("Não foi possível armazenar sua sessão neste navegador.");
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      return;
    }

    showMessage("Login realizado com sucesso! Redirecionando...", "success");
    window.setTimeout(() => {
      window.location.href = "../index.html";
    }, 500);
  });
})();