(() => {
  "use strict";

  const token = localStorage.getItem("authToken");
  const message = document.getElementById("ordersMessage");
  const container = document.getElementById("customerOrders");

  function showMessage(text, error = false) {
    message.textContent = text;
    message.classList.toggle("is-error", error);
  }

  function addText(parent, tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    parent.append(node);
    return node;
  }

  async function start() {
    if (!token) {
      window.location.replace("areadelogin.html");
      return;
    }

    try {
      const response = await fetch(`${window.MBV_API_URL}/pedidos`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(window.MBV_API_HEADERS || {})
        }
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("A API retornou uma resposta inválida.");
      }
      if (response.status === 401) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        window.location.replace("areadelogin.html");
        return;
      }
      if (!response.ok) throw new Error(result.message || "Não foi possível carregar seus pedidos.");
      container.replaceChildren();
      if (!result.pedidos.length) {
        addText(container, "p", "Você ainda não possui pedidos.");
        showMessage("Seus próximos pedidos aparecerão aqui.");
        return;
      }
      result.pedidos.forEach(order => {
        const card = document.createElement("article");
        card.className = "order-card";
        addText(card, "h2", `Pedido #${order.id} — ${order.status}`);
        addText(card, "p", `${new Date(order.criadoEm).toLocaleString("pt-BR")} · Total ${Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
        const items = document.createElement("ul");
        order.itens.forEach(item => {
          addText(items, "li", `${item.quantidade} × ${item.produto} (${item.tamanho}, ${item.cor})`);
        });
        card.append(items);
        container.append(card);
      });
      showMessage("Pedidos carregados. Pedidos pendentes ainda não representam pagamento confirmado.");
    } catch (error) {
      showMessage(error.message || "Não foi possível conectar à API.", true);
    }
  }

  start();
})();
