(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const status = document.getElementById("productPageStatus");
  const details = document.getElementById("productDetails");
  const sizeField = document.getElementById("productSizeField");
  const sizeSelect = document.getElementById("productSize");
  const colorSelect = document.getElementById("productColor");
  const quantityInput = document.getElementById("productQuantity");
  const decreaseButton = document.getElementById("quantityDecrease");
  const increaseButton = document.getElementById("quantityIncrease");
  const addButton = document.getElementById("addProductToCart");
  const feedback = document.getElementById("productFeedback");
  const cartCount = document.getElementById("productCartCount");
  const toast = document.getElementById("productToast");
  const money = value => Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
  let product = null;
  let toastTimer = null;
  let toastHideTimer = null;

  function showMessage(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
    status.hidden = false;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    window.clearTimeout(toastHideTimer);
    toast.hidden = false;
    toast.classList.remove("is-visible");
    window.requestAnimationFrame(() => {
      toast.textContent = message;
      toast.classList.add("is-visible");
    });
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      toastHideTimer = window.setTimeout(() => {
        toast.hidden = true;
      }, 220);
    }, 3000);
  }

  function availableVariations() {
    return product.variacoes.filter(variation => variation.estoque > 0);
  }

  function variationExists(criteria) {
    return availableVariations().some(variation =>
      (!criteria.tamanho || variation.tamanho === criteria.tamanho) &&
      (!criteria.cor || variation.cor === criteria.cor)
    );
  }

  function uniqueValues(key) {
    return [...new Set(product.variacoes.map(variation => variation[key]))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function updateSelectOptions(select, key, placeholder, criteria) {
    const previousValue = select.value;
    const options = [new Option(placeholder, "")];
    uniqueValues(key).forEach(value => {
      const optionCriteria = { ...criteria, [key]: value };
      const available = variationExists(optionCriteria);
      const option = new Option(available ? value : `${value} — esgotado`, value);
      option.disabled = !available;
      options.push(option);
    });
    select.replaceChildren(...options);
    if (previousValue && [...select.options].some(option =>
      option.value === previousValue && !option.disabled
    )) {
      select.value = previousValue;
    }
  }

  function selectedVariation() {
    if (!product) return null;
    if (product.controlaTamanho && !sizeSelect.value) return null;
    if (!colorSelect.value) return null;
    return product.variacoes.find(variation =>
      variation.cor === colorSelect.value &&
      (!product.controlaTamanho || variation.tamanho === sizeSelect.value) &&
      variation.estoque > 0
    ) || null;
  }

  function updateSelection(changedField) {
    const chosenColor = colorSelect.value;
    if (product.controlaTamanho && changedField !== "size") {
      updateSelectOptions(sizeSelect, "tamanho", "Selecione um tamanho", { cor: chosenColor });
    }
    updateSelectOptions(colorSelect, "cor", "Selecione uma cor", {
      tamanho: product.controlaTamanho ? sizeSelect.value : ""
    });
    if (chosenColor && ![...colorSelect.options].some(option =>
      option.value === chosenColor && !option.disabled
    )) {
      colorSelect.value = "";
    } else if (chosenColor) {
      colorSelect.value = chosenColor;
    }

    const variation = selectedVariation();
    const hasStock = availableVariations().length > 0;
    if (!hasStock) {
      document.getElementById("productAvailability").textContent =
        "Este produto está temporariamente sem estoque.";
    } else if (variation) {
      document.getElementById("productAvailability").textContent =
        "Disponível para compra. Selecione a quantidade desejada.";
    } else {
      document.getElementById("productAvailability").textContent =
        product.controlaTamanho
          ? "Escolha o tamanho e a cor para conferir a disponibilidade."
          : "Escolha a cor para conferir a disponibilidade.";
    }

    const maxQuantity = variation ? Math.min(variation.estoque, 99) : 1;
    quantityInput.max = String(maxQuantity);
    if (!variation || changedField === "size" || changedField === "color") {
      quantityInput.value = "1";
    } else if (Number(quantityInput.value) > maxQuantity) {
      quantityInput.value = String(maxQuantity);
    }
    quantityInput.disabled = !variation;
    decreaseButton.disabled = !variation || Number(quantityInput.value) <= 1;
    increaseButton.disabled = !variation || Number(quantityInput.value) >= maxQuantity;
    addButton.disabled = !variation;
  }

  function resolveImageUrl(imageUrl) {
    if (typeof imageUrl !== "string" || !imageUrl) return "../imagens/Logo_MBV.png";
    if (imageUrl.startsWith("/uploads/")) {
      return new URL(imageUrl, window.MBV_API_URL).href;
    }
    const resolved = new URL(
      imageUrl.startsWith("imagens/") ? `../${imageUrl}` : imageUrl,
      document.baseURI
    );
    return ["http:", "https:"].includes(resolved.protocol)
      ? resolved.href
      : "../imagens/Logo_MBV.png";
  }

  function readCart() {
    try {
      const stored = JSON.parse(localStorage.getItem("mbvCart") || "[]");
      if (!Array.isArray(stored)) return [];
      return stored.filter(item =>
        item &&
        typeof item.id === "string" &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0
      );
    } catch {
      return [];
    }
  }

  function updateCartCount() {
    const count = readCart().reduce((sum, item) => sum + Math.min(item.quantity, 99), 0);
    cartCount.textContent = String(count);
  }

  function addToCart(event) {
    event.preventDefault();
    const variation = selectedVariation();
    const quantity = Number(quantityInput.value);
    if (!variation) {
      feedback.textContent = "Selecione uma combinação disponível de tamanho e cor.";
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > Math.min(variation.estoque, 99)) {
      feedback.textContent = "Informe uma quantidade dentro do estoque disponível (máximo de 99 unidades).";
      quantityInput.focus();
      return;
    }

    const cart = readCart();
    const matchingItems = cart.filter(item =>
      item.id === product.slug && Number(item.variationId) === Number(variation.id)
    );
    const currentQuantity = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
    const combinedQuantity = currentQuantity + quantity;
    if (combinedQuantity > Math.min(variation.estoque, 99)) {
      feedback.textContent =
        `A sacola já contém ${currentQuantity} unidade(s) desta opção; não é possível ultrapassar o estoque disponível.`;
      return;
    }

    const nextCart = cart.filter(item =>
      item.id !== product.slug || Number(item.variationId) !== Number(variation.id)
    );
    if (matchingItems.length) {
      nextCart.push({
        ...matchingItems[0],
        id: product.slug,
        quantity: combinedQuantity,
        variationId: Number(variation.id),
        size: variation.tamanho,
        color: variation.cor
      });
    } else {
      nextCart.push({
        id: product.slug,
        quantity,
        variationId: Number(variation.id),
        size: variation.tamanho,
        color: variation.cor
      });
    }

    try {
      localStorage.setItem("mbvCart", JSON.stringify(nextCart));
    } catch {
      feedback.textContent = "Não foi possível salvar a sacola neste navegador. Verifique o espaço disponível e tente novamente.";
      return;
    }
    updateCartCount();
    feedback.textContent = `${quantity} unidade(s) de ${product.nome} adicionada(s) à sacola. Você pode continuar comprando.`;
    showToast("Seu produto foi adicionado à sacola!");
  }

  function renderProduct(entry) {
    product = entry;
    document.title = `${product.nome} | MBV StreetView`;
    document.getElementById("productBreadcrumbName").textContent = product.nome;
    document.getElementById("productCategory").textContent =
      product.categoria.nome.toLocaleUpperCase("pt-BR");
    document.getElementById("productName").textContent = product.nome;
    document.getElementById("productPrice").textContent = money(product.preco);
    document.getElementById("productDescription").textContent =
      product.descricao || "Uma peça selecionada para o seu estilo.";
    const image = document.getElementById("productImage");
    image.src = resolveImageUrl(product.imagemUrl);
    image.alt = product.nome;
    image.addEventListener("error", () => {
      image.src = "../imagens/Logo_MBV.png";
    }, { once: true });

    sizeField.hidden = !product.controlaTamanho;
    sizeSelect.required = product.controlaTamanho;
    if (product.controlaTamanho) {
      updateSelectOptions(sizeSelect, "tamanho", "Selecione um tamanho", {});
    } else {
      document.getElementById("productColorLabel").textContent = "Cor";
    }
    updateSelectOptions(colorSelect, "cor", "Selecione uma cor", {
      tamanho: product.controlaTamanho ? sizeSelect.value : ""
    });
    sizeSelect.addEventListener("change", () => updateSelection("size"));
    colorSelect.addEventListener("change", () => updateSelection("color"));
    quantityInput.addEventListener("input", () => updateSelection("quantity"));
    decreaseButton.addEventListener("click", () => {
      quantityInput.value = String(Math.max(1, Number(quantityInput.value) - 1));
      updateSelection("quantity");
    });
    increaseButton.addEventListener("click", () => {
      const variation = selectedVariation();
      if (!variation) return;
      quantityInput.value = String(Math.min(
        Number(quantityInput.value) + 1,
        variation.estoque,
        99
      ));
      updateSelection("quantity");
    });
    document.getElementById("productPurchaseForm").addEventListener("submit", addToCart);
    updateSelection();
    details.hidden = false;
    status.hidden = true;
  }

  async function loadProduct() {
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      showMessage("Produto não encontrado. Volte à loja e escolha uma peça do catálogo.", true);
      return;
    }
    try {
      const response = await fetch(`${window.MBV_API_URL}/produtos`, {
        headers: window.MBV_API_HEADERS || {}
      });
      if (!response.ok) throw new Error(`Não foi possível consultar o catálogo (HTTP ${response.status}).`);
      const result = await response.json();
      if (!Array.isArray(result.produtos)) throw new Error("A API retornou um catálogo inválido.");
      const selectedProduct = result.produtos.find(item => item.slug === slug);
      if (!selectedProduct) {
        showMessage("Este produto não está disponível. Volte à loja para escolher outra peça.", true);
        return;
      }
      if (!Array.isArray(selectedProduct.variacoes)) {
        throw new Error("As opções deste produto não puderam ser carregadas.");
      }
      renderProduct(selectedProduct);
      updateCartCount();
    } catch (error) {
      showMessage(
        `Não foi possível carregar este produto. ${error.message || "Verifique sua conexão e tente novamente."}`,
        true
      );
    }
  }

  updateCartCount();
  loadProduct();
})();
