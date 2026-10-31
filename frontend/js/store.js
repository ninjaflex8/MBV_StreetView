(() => {
  "use strict";

  const products = {
    pain: { id: "pain", name: "Camiseta Pain", price: 55, image: "../imagens/camisa_pain.jpg" },
    brooklyn: { id: "brooklyn", name: "Camiseta do Brooklyn", price: 65, image: "../imagens/camisa_brooklyn.jpg" },
    galaxy: { id: "galaxy", name: "Camiseta Galaxy", price: 75, image: "../imagens/camisa_desenho_coasta.jpg" },
    anjelical: { id: "anjelical", name: "Camiseta Anjelical", price: 85, image: "../imagens/camisa_anjo.jpg" },
    "bone-street": { id: "bone-street", name: "Boné Street", price: 49, image: "../imagens/bone_street.jpg" },
    "bone-ossos": { id: "bone-ossos", name: "Boné Ossos", price: 49, image: "../imagens/bone_bones.jpg" },
    "jaqueta-nike": { id: "jaqueta-nike", name: "Jaqueta Nike", price: 199, image: "../imagens/jaqueta_nike.jpg" },
    zoro: { id: "zoro", name: "Camiseta Zoro One Piece", price: 59, image: "../imagens/camisa_onepiace.jpg" }
  };

  const money = value => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const safeReadCart = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("mbvCart") || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter(item => products[item.id] && Number.isInteger(item.quantity) && item.quantity > 0)
        .map(item => ({ id: item.id, quantity: Math.min(item.quantity, 99) }));
    } catch (_) {
      return [];
    }
  };

  let cart = safeReadCart();
  let activeFilter = "all";

  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  const cartItems = document.getElementById("cartItems");
  const cartCount = document.getElementById("cartCount");
  const cartTitleCount = document.getElementById("cartTitleCount");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const copyOrder = document.getElementById("copyOrder");
  const cartFeedback = document.getElementById("cartFeedback");
  const productGrid = document.querySelector(".product-grid");
  const productCount = document.getElementById("productCount");
  const emptyProducts = document.getElementById("emptyProducts");
  const modalBackground = document.querySelectorAll(".skip-link, .announcement-bar, .site-nav, main, .ticker, .site-footer");
  let drawerOpener = null;
  let previousBodyOverflow = "";

  function persistCart() {
    try {
      localStorage.setItem("mbvCart", JSON.stringify(cart));
    } catch (_) {
      // A sacola continua utilizável durante esta sessão se o armazenamento estiver bloqueado.
    }
  }

  function cartQuantity() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  function subtotal() {
    return cart.reduce((sum, item) => sum + products[item.id].price * item.quantity, 0);
  }

  function renderCart() {
    const count = cartQuantity();
    cartCount.textContent = count;
    cartTitleCount.textContent = `(${count})`;
    cartSubtotal.textContent = money(subtotal());
    copyOrder.disabled = cart.length === 0;

    if (!cart.length) {
      cartItems.innerHTML = '<p class="cart-empty">Sua sacola está vazia.<br><span>O próximo achado pode estar logo ali.</span></p>';
      return;
    }

    cartItems.replaceChildren();
    cart.forEach(item => {
      const product = products[item.id];
      const row = document.createElement("article");
      row.className = "cart-item";

      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.name;

      const details = document.createElement("div");
      const name = document.createElement("h3");
      name.textContent = product.name;
      const price = document.createElement("p");
      price.className = "cart-item-price";
      price.textContent = money(product.price);
      const quantity = document.createElement("div");
      quantity.className = "quantity-control";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "−";
      minus.setAttribute("aria-label", `Diminuir quantidade de ${product.name}`);
      minus.addEventListener("click", () => changeQuantity(item.id, -1));

      const amount = document.createElement("span");
      amount.textContent = item.quantity;

      const plus = document.createElement("button");
      plus.type = "button";
      plus.textContent = "+";
      plus.setAttribute("aria-label", `Aumentar quantidade de ${product.name}`);
      plus.disabled = item.quantity >= 99;
      plus.addEventListener("click", () => changeQuantity(item.id, 1));

      quantity.append(minus, amount, plus);
      details.append(name, price, quantity);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-item";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remover ${product.name} da sacola`);
      remove.addEventListener("click", () => {
        cart = cart.filter(entry => entry.id !== item.id);
        persistCart();
        renderCart();
      });

      row.append(image, details, remove);
      cartItems.append(row);
    });
  }

  function addToCart(id) {
    if (!products[id]) return;
    const existing = cart.find(item => item.id === id);
    if (existing) {
      if (existing.quantity >= 99) {
        showFeedback("Limite de 99 unidades por peça.");
        return;
      }
      existing.quantity += 1;
    } else {
      cart.push({ id, quantity: 1 });
    }
    persistCart();
    renderCart();
    showFeedback(`${products[id].name} adicionada à sacola.`);
    openDrawer();
  }

  function changeQuantity(id, amount) {
    const item = cart.find(entry => entry.id === id);
    if (!item) return;
    item.quantity += amount;
    if (item.quantity <= 0) cart = cart.filter(entry => entry.id !== id);
    persistCart();
    renderCart();
  }

  function showFeedback(message) {
    cartFeedback.textContent = message;
  }

  function openDrawer() {
    if (drawer.classList.contains("is-open")) return;
    drawerOpener = document.activeElement;
    previousBodyOverflow = document.body.style.overflow;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    drawer.inert = false;
    document.getElementById("openCart").setAttribute("aria-expanded", "true");
    modalBackground.forEach(element => { element.inert = true; });
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("closeCart").focus();
  }

  function closeDrawer() {
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true;
    document.getElementById("openCart").setAttribute("aria-expanded", "false");
    modalBackground.forEach(element => { element.inert = false; });
    overlay.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
    if (drawerOpener instanceof HTMLElement && drawerOpener.isConnected) {
      drawerOpener.focus();
    } else {
      document.getElementById("openCart").focus();
    }
    drawerOpener = null;
  }

  function containDrawerFocus(event) {
    if (event.key !== "Tab" || !drawer.classList.contains("is-open")) return;
    const focusable = Array.from(drawer.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.hidden);
    if (!focusable.length) {
      event.preventDefault();
      drawer.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  document.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => addToCart(button.dataset.add));
  });
  document.getElementById("openCart").addEventListener("click", openDrawer);
  document.getElementById("closeCart").addEventListener("click", closeDrawer);
  document.getElementById("continueShopping").addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
    containDrawerFocus(event);
  });

  function applyFilters() {
    const cards = Array.from(productGrid.querySelectorAll(".product-card"));
    const sort = document.getElementById("productSort").value;
    cards.forEach((card, index) => {
      if (card.dataset.originalIndex === undefined) {
        card.dataset.originalIndex = String(index);
      }
    });
    cards.sort((a, b) => {
      if (sort === "price-asc") return Number(a.dataset.price) - Number(b.dataset.price);
      if (sort === "price-desc") return Number(b.dataset.price) - Number(a.dataset.price);
      if (sort === "name") return a.dataset.name.localeCompare(b.dataset.name, "pt-BR");
      return Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex);
    });
    cards.forEach(card => {
      const visible = activeFilter === "all" || card.dataset.category === activeFilter;
      card.hidden = !visible;
      productGrid.append(card);
    });
    const visibleCount = cards.filter(card => !card.hidden).length;
    productCount.textContent = `${String(visibleCount).padStart(2, "0")} ${visibleCount === 1 ? "PEÇA" : "PEÇAS"}`;
    emptyProducts.hidden = visibleCount !== 0;
  }

  document.querySelectorAll(".filter-button").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll(".filter-button").forEach(filterButton => {
        const active = filterButton === button;
        filterButton.classList.toggle("is-active", active);
        filterButton.setAttribute("aria-pressed", String(active));
      });
      applyFilters();
    });
  });
  document.getElementById("productSort").addEventListener("change", applyFilters);

  copyOrder.addEventListener("click", async () => {
    if (!cart.length) return;
    const lines = cart.map(item => {
      const product = products[item.id];
      return `${item.quantity}x ${product.name} — ${money(product.price * item.quantity)}`;
    });
    const orderText = `PEDIDO — MBV STREETVIEW\n${lines.join("\n")}\n\nSubtotal: ${money(subtotal())}\n\nFrete e pagamento a combinar com a loja.`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(orderText);
      } else {
        const field = document.createElement("textarea");
        field.value = orderText;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("Não foi possível copiar automaticamente.");
      }
      showFeedback("Resumo copiado. Você pode enviá-lo ao atendimento da MBV.");
    } catch (_) {
      showFeedback("Não foi possível copiar. Tente novamente em uma página segura.");
    }
  });

  renderCart();
  applyFilters();
})();