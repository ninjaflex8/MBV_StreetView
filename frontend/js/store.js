(() => {
  "use strict";

  const products = {
    pain: { id: "pain", name: "Camiseta Pain", price: 55, image: "imagens/camisa_pain.jpg" },
    brooklyn: { id: "brooklyn", name: "Camiseta do Brooklyn", price: 65, image: "imagens/camisa_brooklyn.jpg" },
    galaxy: { id: "galaxy", name: "Camiseta Galaxy", price: 75, image: "imagens/camisa_desenho_coasta.jpg" },
    anjelical: { id: "anjelical", name: "Camiseta Anjelical", price: 85, image: "imagens/camisa_anjo.jpg" },
    "bone-street": { id: "bone-street", name: "Boné Street", price: 49, image: "imagens/bone_street.jpg" },
    "bone-ossos": { id: "bone-ossos", name: "Boné Ossos", price: 49, image: "imagens/bone_bones.jpg" },
    "jaqueta-nike": { id: "jaqueta-nike", name: "Jaqueta Nike", price: 199, image: "imagens/jaqueta_nike.jpg" },
    zoro: { id: "zoro", name: "Camiseta Zoro One Piece", price: 59, image: "imagens/camisa_onepiace.jpg" }
  };

  const money = value => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const safeReadCart = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("mbvCart") || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter(item =>
        typeof item.id === "string" &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      )
        .map(item => ({
          id: item.id,
          quantity: Math.min(item.quantity, 99),
          ...(Number.isSafeInteger(item.variationId) && item.variationId > 0
              ? { variationId: item.variationId, size: item.size, color: item.color }
              : {})
        }));
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
  const checkoutOrder = document.getElementById("checkoutOrder");
  const cartFeedback = document.getElementById("cartFeedback");
  const productGrid = document.querySelector(".product-grid");
  const productCount = document.getElementById("productCount");
  const filterGroup = document.querySelector(".filter-group");
  const emptyProducts = document.getElementById("emptyProducts");
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navLinks = document.getElementById("mainNavLinks");
  const carouselImage = document.getElementById("heroCarouselImage");
  const carouselCount = document.getElementById("heroCarouselCount");
  const carouselStatus = document.getElementById("heroCarouselStatus");
  const carouselFrame = document.getElementById("heroCarousel");
  const carouselToggle = document.getElementById("heroCarouselToggle");
  const carouselProgress = document.getElementById("heroCarouselProgress");
  const carouselProgressBar = document.querySelector(".carousel-progress");
  const carouselDuration = 5000;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const carouselSlides = [
    { src: "imagens/camisa_brooklyn.jpg", alt: "Camiseta Brooklyn da coleção MBV StreetView" },
    { src: "imagens/camisa_pain.jpg", alt: "Camiseta Pain da coleção MBV StreetView" },
    { src: "imagens/camisa_desenho_coasta.jpg", alt: "Camiseta Galaxy da coleção MBV StreetView" },
    { src: "imagens/jaqueta_nike.jpg", alt: "Jaqueta da coleção MBV StreetView" }
  ];
  let carouselIndex = 0;
  let carouselTimer = null;
  let progressTimer = null;
  let carouselStartedAt = 0;
  let carouselRemaining = carouselDuration;
  let carouselManuallyPaused = reducedMotion.matches;
  let carouselFocusPaused = false;
  let returnFocusTarget = null;

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
    cartSubtotal.textContent = cart.every(item => products[item.id])
        ? money(subtotal())
        : "Indisponível";
    copyOrder.disabled = cart.length === 0;
    checkoutOrder.disabled = cart.length === 0;

    if (!cart.length) {
      cartItems.innerHTML = '<p class="cart-empty">Sua sacola está vazia.<br><span>O próximo achado pode estar logo ali.</span></p>';
      return;
    }

    cartItems.replaceChildren();
    cart.forEach(item => {
      const product = products[item.id];
      if (!product) {
        const row = document.createElement("article");
        row.className = "cart-item";
        const details = document.createElement("div");
        const name = document.createElement("h3");
        name.textContent = "Produto fora do catálogo atual";
        const notice = document.createElement("p");
        notice.textContent = "Atualize a loja para validar este item ou remova-o da sacola.";
        details.append(name, notice);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-item";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `Remover produto ${item.id} da sacola`);
        remove.addEventListener("click", () => {
          cart = cart.filter(entry => entry !== item);
          persistCart();
          renderCart();
        });
        row.append(details, remove);
        cartItems.append(row);
        return;
      }
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
      const variation = product.variations?.find(entry =>
          entry.id === item.variationId
      ) || product.variations?.[0];
      if (variation) {
        const variantLabel = document.createElement("p");
        variantLabel.className = "cart-item-variant";
        variantLabel.textContent = `${item.size || variation.tamanho} / ${item.color || variation.cor}`;
        details.append(name, price, variantLabel);
      } else {
        details.append(name, price);
      }
      const quantity = document.createElement("div");
      quantity.className = "quantity-control";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "−";
      minus.setAttribute("aria-label", `Diminuir quantidade de ${product.name}`);
      minus.addEventListener("click", () => changeQuantity(item.id, item.variationId, -1));

      const amount = document.createElement("span");
      amount.textContent = item.quantity;

      const plus = document.createElement("button");
      plus.type = "button";
      plus.textContent = "+";
      plus.setAttribute("aria-label", `Aumentar quantidade de ${product.name}`);
      plus.disabled = item.quantity >= 99 || Boolean(variation && item.quantity >= variation.estoque);
      plus.addEventListener("click", () => changeQuantity(item.id, item.variationId, 1));

      quantity.append(minus, amount, plus);
      details.append(quantity);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-item";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remover ${product.name} da sacola`);
      remove.addEventListener("click", () => {
        cart = cart.filter(entry => entry.id !== item.id || entry.variationId !== item.variationId);
        persistCart();
        renderCart();
      });

      row.append(image, details, remove);
      cartItems.append(row);
    });
  }

  function addToCart(id, variationId) {
    if (!products[id]) return;
    const product = products[id];
    const variation = product.variations?.find(entry => entry.id === Number(variationId));
    if (product.variations?.length && !variation) {
      showFeedback("Selecione uma variação disponível antes de adicionar à sacola.");
      return;
    }
    if (variation && variation.estoque < 1) {
      showFeedback("Esta variação está sem estoque no momento.");
      return;
    }
    const existing = cart.find(item =>
        item.id === id && Number(item.variationId || 0) === Number(variation?.id || 0)
    );
    if (existing) {
      if (existing.quantity >= 99 || (variation && existing.quantity >= variation.estoque)) {
        showFeedback(variation
            ? `Estoque disponível: ${variation.estoque} unidade(s).`
            : "Limite de 99 unidades por peça.");
        return;
      }
      existing.quantity += 1;
    } else {
      cart.push({
        id,
        quantity: 1,
        ...(variation ? {
          variationId: variation.id,
          size: variation.tamanho,
          color: variation.cor
        } : {})
      });
    }
    persistCart();
    renderCart();
    showFeedback(`${product.name} adicionada à sacola.`);
    openDrawer();
  }

  function changeQuantity(id, variationId, amount) {
    const item = cart.find(entry =>
        entry.id === id && entry.variationId === variationId
    );
    if (!item) return;
    item.quantity += amount;
    const product = products[id];
    const variation = product?.variations?.find(entry => entry.id === item.variationId);
    if (variation && item.quantity > variation.estoque) {
      item.quantity = variation.estoque;
      showFeedback(`Estoque disponível: ${variation.estoque} unidade(s).`);
    }
    if (item.quantity <= 0) {
      cart = cart.filter(entry => entry.id !== id || entry.variationId !== variationId);
    }
    persistCart();
    renderCart();
  }

  function showFeedback(message) {
    cartFeedback.textContent = message;
  }

  function openDrawer() {
    if (!drawer.classList.contains("is-open")) {
      returnFocusTarget = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    drawer.inert = false;
    document.getElementById("openCart").setAttribute("aria-expanded", "true");
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
    overlay.hidden = true;
    document.body.style.overflow = "";
    const focusTarget = returnFocusTarget;
    returnFocusTarget = null;
    if (focusTarget && document.contains(focusTarget)) {
      focusTarget.focus();
    } else {
      document.getElementById("openCart").focus();
    }
  }

  function showCarouselSlide(index, announce = true) {
    carouselIndex = (index + carouselSlides.length) % carouselSlides.length;
    const slide = carouselSlides[carouselIndex];
    carouselImage.src = slide.src;
    carouselImage.alt = slide.alt;
    carouselCount.textContent = `MBV / ${String(carouselIndex + 1).padStart(3, "0")}`;
    if (announce) {
      carouselStatus.textContent = `Imagem ${carouselIndex + 1} de ${carouselSlides.length}: ${slide.alt}`;
    }
  }

  function updateCarouselProgress() {
    const elapsed = carouselDuration - carouselRemaining;
    const progress = Math.min(100, Math.round((elapsed / carouselDuration) * 100));
    carouselProgress.style.width = `${progress}%`;
    carouselProgressBar.setAttribute("aria-valuenow", String(progress));
  }

  function stopCarouselTimer() {
    if (carouselTimer) window.clearTimeout(carouselTimer);
    if (progressTimer) window.clearInterval(progressTimer);
    carouselTimer = null;
    progressTimer = null;
    if (carouselStartedAt) {
      carouselRemaining = Math.max(0, carouselRemaining - (Date.now() - carouselStartedAt));
      carouselStartedAt = 0;
    }
    updateCarouselProgress();
  }

  function startCarouselTimer() {
    if (carouselManuallyPaused || document.hidden || carouselFrame.matches(":hover, :focus-within") || carouselTimer) return;
    carouselStartedAt = Date.now();
    carouselTimer = window.setTimeout(() => {
      carouselTimer = null;
      carouselStartedAt = 0;
      carouselRemaining = carouselDuration;
      showCarouselSlide(carouselIndex + 1, false);
      updateCarouselProgress();
      startCarouselTimer();
    }, carouselRemaining);
    progressTimer = window.setInterval(() => {
      carouselRemaining = Math.max(0, carouselDuration - (Date.now() - carouselStartedAt));
      updateCarouselProgress();
    }, 100);
  }

  function restartCarouselTimer() {
    stopCarouselTimer();
    carouselRemaining = carouselDuration;
    updateCarouselProgress();
    startCarouselTimer();
  }

  function updateCarouselToggle() {
    const paused = carouselManuallyPaused || carouselFocusPaused || document.hidden || carouselFrame.matches(":hover");
    carouselToggle.textContent = paused ? "▶" : "Ⅱ";
    carouselToggle.setAttribute("aria-label", paused ? "Iniciar carrossel" : "Pausar carrossel");
  }

  function refreshCarouselTimer() {
    updateCarouselToggle();
    if (carouselManuallyPaused || carouselFocusPaused || document.hidden || carouselFrame.matches(":hover")) {
      stopCarouselTimer();
    } else {
      startCarouselTimer();
    }
  }

  document.getElementById("heroCarouselPrevious").addEventListener("click", () => {
    showCarouselSlide(carouselIndex - 1);
    restartCarouselTimer();
  });
  document.getElementById("heroCarouselNext").addEventListener("click", () => {
    showCarouselSlide(carouselIndex + 1);
    restartCarouselTimer();
  });
  carouselToggle.addEventListener("click", () => {
    carouselManuallyPaused = !carouselManuallyPaused;
    if (!carouselManuallyPaused) carouselFocusPaused = false;
    refreshCarouselTimer();
  });
  carouselFrame.addEventListener("mouseenter", refreshCarouselTimer);
  carouselFrame.addEventListener("mouseleave", refreshCarouselTimer);
  carouselFrame.addEventListener("focusin", () => {
    carouselFocusPaused = true;
    refreshCarouselTimer();
  });
  carouselFrame.addEventListener("focusout", event => {
    if (!carouselFrame.contains(event.relatedTarget)) {
      carouselFocusPaused = false;
      refreshCarouselTimer();
    }
  });
  document.addEventListener("visibilitychange", refreshCarouselTimer);
  reducedMotion.addEventListener("change", event => {
    if (event.matches) carouselManuallyPaused = true;
    refreshCarouselTimer();
  });

  function closeMobileMenu() {
    navLinks.classList.remove("is-open");
    mobileMenuToggle.setAttribute("aria-expanded", "false");
    mobileMenuToggle.setAttribute("aria-label", "Abrir menu de navegação");
  }

  mobileMenuToggle.addEventListener("click", () => {
    const isOpen = mobileMenuToggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMobileMenu();
      return;
    }

    navLinks.classList.add("is-open");
    mobileMenuToggle.setAttribute("aria-expanded", "true");
    mobileMenuToggle.setAttribute("aria-label", "Fechar menu de navegação");
  });
  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMobileMenu);
  });

  productGrid.addEventListener("click", event => {
    const button = event.target.closest("[data-add]");
    if (!button || !productGrid.contains(button)) return;
    const card = button.closest(".product-card");
    const selector = card.querySelector("[data-variation-select]");
    addToCart(button.dataset.add, selector?.value);
  });
  document.getElementById("openCart").addEventListener("click", openDrawer);
  document.getElementById("closeCart").addEventListener("click", closeDrawer);
  document.getElementById("continueShopping").addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        mobileMenuToggle.getAttribute("aria-expanded") === "true"
    ) {
      closeMobileMenu();
      mobileMenuToggle.focus();
      return;
    }

    if (!drawer.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
      return;
    }

    if (event.key !== "Tab") return;
    const focusableElements = Array.from(drawer.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.hidden && element.getClientRects().length > 0);
    if (!focusableElements.length) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function applyFilters() {
    const cards = Array.from(productGrid.querySelectorAll(".product-card"));
    const sort = document.getElementById("productSort").value;
    cards.sort((a, b) => {
      if (sort === "price-asc") return Number(a.dataset.price) - Number(b.dataset.price);
      if (sort === "price-desc") return Number(b.dataset.price) - Number(a.dataset.price);
      if (sort === "name") return a.dataset.name.localeCompare(b.dataset.name, "pt-BR");
      return Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex);
    });
    cards.forEach((card, index) => {
      if (!card.dataset.originalIndex) card.dataset.originalIndex = String(index);
      const visible = activeFilter === "all" || card.dataset.category === activeFilter;
      card.hidden = !visible;
      productGrid.append(card);
    });
    const visibleCount = cards.filter(card => !card.hidden).length;
    productCount.textContent = `${String(visibleCount).padStart(2, "0")} ${visibleCount === 1 ? "PEÇA" : "PEÇAS"}`;
    emptyProducts.hidden = visibleCount !== 0;
  }

  filterGroup.addEventListener("click", event => {
    const button = event.target.closest(".filter-button");
    if (!button) return;
      activeFilter = button.dataset.filter;
      document.querySelectorAll(".filter-button").forEach(filterButton => {
        const active = filterButton === button;
        filterButton.classList.toggle("is-active", active);
        filterButton.setAttribute("aria-pressed", String(active));
      });
      applyFilters();
  });
  document.getElementById("productSort").addEventListener("change", applyFilters);

  copyOrder.addEventListener("click", async () => {
    if (!cart.length) return;
    const lines = cart.map(item => {
      const product = products[item.id];
      const variation = product.variations?.find(entry => entry.id === item.variationId)
          || product.variations?.[0];
      const variantText = variation
          ? ` (${item.size || variation.tamanho}, ${item.color || variation.cor})`
          : "";
      return `${item.quantity}x ${product.name}${variantText} — ${money(product.price * item.quantity)}`;
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

  function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.setAttribute("role", "listitem");
    card.dataset.category = product.categoria.slug;
    card.dataset.price = String(product.price);
    card.dataset.name = product.name;
    card.dataset.originalIndex = String(product.originalIndex);

    const imageWrap = document.createElement("div");
    imageWrap.className = "product-image-wrap";
    const image = document.createElement("img");
    image.src = product.image || "imagens/Logo_MBV.png";
    image.alt = product.name;
    image.loading = "lazy";
    image.addEventListener("error", () => {
      image.src = "imagens/Logo_MBV.png";
    }, { once: true });
    imageWrap.append(image);
    const quickAdd = document.createElement("button");
    quickAdd.className = "quick-add";
    quickAdd.type = "button";
    quickAdd.dataset.add = product.id;
    quickAdd.setAttribute("aria-label", `Adicionar ${product.name} à sacola`);
    quickAdd.textContent = "+";
    quickAdd.disabled = product.variations.every(variation => variation.estoque < 1);
    imageWrap.append(quickAdd);

    const details = document.createElement("div");
    details.className = "product-details";
    const titleWrap = document.createElement("div");
    const category = document.createElement("p");
    category.className = "product-category";
    category.textContent = product.categoria.nome.toLocaleUpperCase("pt-BR");
    const name = document.createElement("h3");
    name.textContent = product.name;
    titleWrap.append(category, name);
    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = money(product.price);
    details.append(titleWrap, price);

    const description = document.createElement("p");
    description.className = "product-description";
    description.textContent = product.description || "";
    const selectorLabel = document.createElement("label");
    selectorLabel.className = "product-variation-label";
    const selectorId = `variation-${product.id}`;
    selectorLabel.htmlFor = selectorId;
    selectorLabel.textContent = "Tamanho / cor";
    const selector = document.createElement("select");
    selector.id = selectorId;
    selector.dataset.variationSelect = "";
    const available = product.variations.filter(variation => variation.estoque > 0);
    product.variations.forEach(variation => {
      const option = document.createElement("option");
      option.value = String(variation.id);
      option.textContent = `${variation.tamanho} / ${variation.cor} — ${variation.estoque} disponível(is)`;
      option.disabled = variation.estoque < 1;
      selector.append(option);
    });
    if (!available.length) {
      const unavailable = document.createElement("option");
      unavailable.textContent = "Sem estoque";
      unavailable.value = "";
      selector.replaceChildren(unavailable);
      selector.disabled = true;
    }

    const addButton = document.createElement("button");
    addButton.className = "add-button";
    addButton.type = "button";
    addButton.dataset.add = product.id;
    addButton.append(document.createTextNode(available.length ? "Adicionar à sacola " : "Indisponível "));
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    addButton.append(arrow);
    addButton.disabled = available.length === 0;
    card.append(imageWrap, details, description, selectorLabel, selector, addButton);
    return card;
  }

  async function loadCatalog() {
    try {
      const response = await fetch(`${window.MBV_API_URL}/produtos`, {
        headers: window.MBV_API_HEADERS || {}
      });
      if (!response.ok) throw new Error("Catálogo indisponível.");
      const result = await response.json();
      if (!Array.isArray(result.produtos)) throw new Error("Formato de catálogo inválido.");
      const categoriesResponse = await fetch(`${window.MBV_API_URL}/produtos/categorias`, {
        headers: window.MBV_API_HEADERS || {}
      });
      if (!categoriesResponse.ok) throw new Error("Categorias indisponíveis.");
      const categoriesResult = await categoriesResponse.json();
      if (Array.isArray(categoriesResult.categorias)) {
        const allFilter = filterGroup.querySelector('[data-filter="all"]');
        filterGroup.replaceChildren(allFilter);
        categoriesResult.categorias.forEach(category => {
          const button = document.createElement("button");
          button.className = "filter-button";
          button.type = "button";
          button.dataset.filter = category.slug;
          button.setAttribute("aria-pressed", "false");
          button.textContent = category.nome;
          filterGroup.append(button);
        });
        if (activeFilter !== "all" && !categoriesResult.categorias.some(category => category.slug === activeFilter)) {
          activeFilter = "all";
          allFilter.classList.add("is-active");
          allFilter.setAttribute("aria-pressed", "true");
        }
      }
      result.produtos.forEach((entry, index) => {
        products[entry.slug] = {
          id: entry.slug,
          name: entry.nome,
          price: Number(entry.preco),
          image: entry.imagemUrl,
          description: entry.descricao || "",
          categoria: entry.categoria,
          variations: entry.variacoes,
          originalIndex: index
        };
      });
      productGrid.replaceChildren(...result.produtos.map((entry, index) =>
        createProductCard(products[entry.slug])
      ));
      cart = cart.filter(item => products[item.id]);
      persistCart();
      renderCart();
      applyFilters();
    } catch {
      showFeedback("Catálogo online indisponível; exibindo os produtos já carregados.");
    }
  }

  function orderCartSignature() {
    return cart.map(item => {
      const product = products[item.id];
      const variation = product?.variations?.find(entry => entry.id === item.variationId)
          || product?.variations?.[0];
      return `${item.id}:${item.variationId || variation?.id || ""}:${item.quantity}`;
    }).sort().join("|");
  }

  checkoutOrder.addEventListener("click", async () => {
    if (!cart.length || checkoutOrder.disabled) return;
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      showFeedback("Entre na sua conta para criar um pedido.");
      window.location.href = "pages/areadelogin.html";
      return;
    }
    const itens = cart.map(item => {
      const product = products[item.id];
      const variation = product?.variations?.find(entry => entry.id === item.variationId)
          || product?.variations?.[0];
      return variation ? { variacaoId: variation.id, quantidade: item.quantity } : null;
    });
    if (itens.some(item => item === null)) {
      showFeedback("Atualize o catálogo para selecionar uma variação válida antes de criar o pedido.");
      return;
    }

    checkoutOrder.disabled = true;
    try {
      const signature = orderCartSignature();
      let attempt;
      try {
        attempt = JSON.parse(localStorage.getItem("mbvOrderAttempt") || "null");
      } catch {
        attempt = null;
      }
      if (!attempt || attempt.signature !== signature || typeof attempt.key !== "string") {
        attempt = { signature, key: crypto.randomUUID() };
        localStorage.setItem("mbvOrderAttempt", JSON.stringify(attempt));
      }
      const response = await fetch(`${window.MBV_API_URL}/pedidos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          ...(window.MBV_API_HEADERS || {})
        },
        body: JSON.stringify({ itens, chaveIdempotencia: attempt.key })
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
        window.location.href = "pages/areadelogin.html";
        return;
      }
      if (!response.ok) throw new Error(result.message || "Não foi possível criar o pedido.");
      localStorage.removeItem("mbvOrderAttempt");
      cart = [];
      persistCart();
      renderCart();
      showFeedback(`Pedido #${result.pedido.id} criado como pendente. Nenhum pagamento foi processado; o estoque será baixado após a confirmação administrativa.`);
    } catch (error) {
      showFeedback(error.message || "Não foi possível conectar à API. A sacola foi preservada; tente novamente.");
    } finally {
      checkoutOrder.disabled = cart.length === 0;
    }
  });

  renderCart();
  applyFilters();
  showCarouselSlide(0);
  updateCarouselProgress();
  refreshCarouselTimer();
  loadCatalog();
})();