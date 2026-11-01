(() => {
  "use strict";

  const form = document.getElementById("registerForm");
  if (!form) return;

  const nameInput = document.getElementById("nome");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("senha");
  const confirmPasswordInput = document.getElementById("confirmarSenha");
  const submitButton = document.getElementById("cadastro_BTN");
  const loginButton = document.getElementById("login_BTN");
  const message = document.getElementById("message");

  function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `msg ${type}`;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nome = nameInput.value.trim();
    const email = emailInput.value.trim();
    const senha = passwordInput.value;

    if (senha !== confirmPasswordInput.value) {
      showMessage("As senhas não coincidem.");
      confirmPasswordInput.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    showMessage("Enviando cadastro...", "success");

    let response;
    try {
      response = await fetch(`${window.MBV_API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(window.MBV_API_HEADERS || {})
        },
        body: JSON.stringify({ nome, email, senha })
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
      showMessage(resultado.message || "Não foi possível realizar o cadastro.");
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      return;
    }

    showMessage("Cadastro realizado com sucesso! Agora entre com seu e-mail e senha.", "success");
    form.reset();
    submitButton.hidden = true;
    loginButton.hidden = false;
    loginButton.focus();
  });
})();