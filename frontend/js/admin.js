(() => {
  "use strict";

  const token = localStorage.getItem("authToken");
  const content = document.getElementById("adminContent");
  const accessMessage = document.getElementById("accessMessage");
  const message = document.getElementById("adminMessage");
  const productForm = document.getElementById("productForm");
  const productImageInput = document.getElementById("productImage");
  const productImageUrl = document.getElementById("productImageUrl");
  const productImagePreview = document.getElementById("productImagePreview");
  const productImagePreviewImage = document.getElementById("productImagePreviewImage");
  const productImagePreviewName = document.getElementById("productImagePreviewName");
  const money = value => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  let categorias = [];
  let produtos = [];
  let produtoVariacoesId = null;
  let temporaryImageUrl = null;

  function showMessage(text, error = false) {
    message.textContent = text;
    message.classList.toggle("is-error", error);
  }

  function resolveImageUrl(imageUrl) {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("/uploads/")) {
      return new URL(imageUrl, window.MBV_API_URL).href;
    }
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
    return new URL(`../${imageUrl.replace(/^\/+/, "")}`, document.baseURI).href;
  }

  function showProductImagePreview(imageUrl, label) {
    imageUrl = typeof imageUrl === "string" ? imageUrl : "";
    const isTemporaryImage = imageUrl.startsWith("blob:");
    if (temporaryImageUrl && temporaryImageUrl !== imageUrl) {
      URL.revokeObjectURL(temporaryImageUrl);
      temporaryImageUrl = null;
    }
    if (!imageUrl) {
      productImagePreview.hidden = true;
      productImagePreviewImage.removeAttribute("src");
      productImagePreviewName.textContent = "";
      return;
    }
    if (isTemporaryImage) temporaryImageUrl = imageUrl;
    productImagePreviewImage.src = imageUrl.startsWith("blob:")
        ? imageUrl
        : resolveImageUrl(imageUrl);
    productImagePreviewName.textContent = label;
    productImagePreview.hidden = false;
  }

  productImageInput.addEventListener("change", () => {
    const file = productImageInput.files[0];
    if (!file) {
      showProductImagePreview(productImageUrl.value, productImageUrl.value ? "Imagem atual" : "");
      return;
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      productImageInput.value = "";
      showProductImagePreview(productImageUrl.value, productImageUrl.value ? "Imagem atual" : "");
      showMessage("Selecione uma imagem JPG, PNG ou WebP de até 5 MB.", true);
      return;
    }
    showProductImagePreview(URL.createObjectURL(file), file.name);
  });

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  async function api(path, options = {}) {
    let response;
    try {
      response = await fetch(`${window.MBV_API_URL}${path}`, {
        ...options,
        headers: {
          ...(options.body && !(options.body instanceof FormData)
              ? { "Content-Type": "application/json" }
              : {}),
          Authorization: `Bearer ${token}`,
          ...(window.MBV_API_HEADERS || {}),
          ...(options.headers || {})
        }
      });
    } catch {
      throw new Error("Não foi possível conectar à API. Verifique o servidor e tente novamente.");
    }

    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error("A API retornou uma resposta inválida.");
    }
    if (response.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      window.location.replace("areadelogin.html");
      throw new Error("Sua sessão expirou. Entre novamente.");
    }
    if (!response.ok) throw new Error(body.message || "Não foi possível concluir a operação.");
    return body;
  }

  function makeTable(headers, rows) {
    const wrapper = element("div", null, "admin-table-wrap");
    const table = element("table", null, "admin-table");
    const thead = document.createElement("thead");
    const heading = document.createElement("tr");
    headers.forEach(label => heading.append(element("th", label)));
    thead.append(heading);
    const tbody = document.createElement("tbody");
    rows.forEach(row => tbody.append(row));
    table.append(thead, tbody);
    wrapper.append(table);
    return wrapper;
  }

  function emptyRow(columnCount, text) {
    const row = document.createElement("tr");
    const cell = element("td", text);
    cell.colSpan = columnCount;
    row.append(cell);
    return row;
  }

  async function loadCategories() {
    const result = await api("/admin/categorias");
    categorias = result.categorias;
    const select = document.getElementById("productCategory");
    select.replaceChildren();
    categorias.filter(category => category.ativo).forEach(category => {
      const option = element("option", category.nome);
      option.value = category.id;
      select.append(option);
    });
    renderCategories();
  }

  async function loadProducts() {
    const result = await api("/admin/produtos?todos=true");
    produtos = result.produtos;
    renderProducts();
  }

  async function loadDashboard() {
    const result = await api("/admin/dashboard");
    const metrics = document.getElementById("dashboardMetrics");
    metrics.replaceChildren();
    const labels = [
      ["produtos", "Produtos cadastrados"],
      ["produtosAtivos", "Produtos ativos"],
      ["produtosSemEstoque", "Produtos sem estoque"],
      ["produtosEstoqueBaixo", "Produtos com estoque baixo (1–5 un.)"],
      ["unidadesDisponiveis", "Unidades em estoque"],
      ["pedidosPendentes", "Pedidos pendentes"],
      ["pedidosConfirmados", "Pedidos confirmados"]
    ];
    labels.forEach(([key, title]) => {
      const card = element("article", null, "metric-card");
      card.append(element("span", title), element("strong", result.resumo[key]));
      metrics.append(card);
    });
    const movements = makeTable(
        ["Data", "Produto / variação", "Tipo", "Quantidade", "Responsável"],
        result.movimentacoes.length
            ? result.movimentacoes.map(movementRow)
            : [emptyRow(5, "Nenhuma movimentação registrada.")]
    );
    movements.id = "dashboardMovements";
    document.getElementById("dashboardMovements").replaceWith(movements);
  }

  function movementRow(movement) {
    const row = document.createElement("tr");
    [
      new Date(movement.criadoEm).toLocaleString("pt-BR"),
      `${movement.produto} — ${movement.tamanho} / ${movement.cor}`,
      movement.tipo,
      `${movement.quantidade} (${movement.estoqueAnterior} → ${movement.estoquePosterior})`,
      movement.responsavel || "Sistema"
    ].forEach(value => row.append(element("td", value)));
    return row;
  }

  function renderProducts() {
    const rows = produtos.map(product => {
      const row = document.createElement("tr");
      [
        String(product.id),
        product.nome,
        product.categoria.nome,
        money(product.preco),
        product.ativo ? "Ativo" : "Inativo",
        String(product.variacoes.reduce((sum, variation) => sum + variation.estoque, 0))
      ].forEach(value => row.append(element("td", value)));
      const actions = element("td", null, "admin-row-actions");
      const variations = element("button", "Variações / estoque", "admin-small-button");
      variations.type = "button";
      variations.addEventListener("click", () => openVariantManager(product));
      const edit = element("button", "Editar", "admin-small-button");
      edit.type = "button";
      edit.addEventListener("click", () => editProduct(product));
      const deactivate = element("button", product.ativo ? "Desativar" : "Ativar", "admin-small-button");
      deactivate.type = "button";
      deactivate.addEventListener("click", async () => {
        try {
          await api(`/admin/produtos/${product.id}`, {
            method: "PUT",
            body: JSON.stringify({ ativo: !product.ativo })
          });
          await Promise.all([loadProducts(), loadDashboard()]);
          showMessage("Status do produto atualizado.");
        } catch (error) {
          showMessage(error.message, true);
        }
      });
      actions.append(variations, edit, deactivate);
      row.append(actions);
      return row;
    });
    document.getElementById("productsTable").replaceChildren(
        makeTable(["ID", "Produto", "Categoria", "Preço", "Status", "Estoque", "Ações"],
            rows.length ? rows : [emptyRow(7, "Nenhum produto cadastrado.")])
    );
  }

  function editProduct(product) {
    document.getElementById("productId").value = product.id;
    document.getElementById("productName").value = product.nome;
    document.getElementById("productDescription").value = product.descricao || "";
    document.getElementById("productPrice").value = product.preco.toFixed(2);
    document.getElementById("productCategory").value = product.categoria.id;
    productImageInput.value = "";
    productImageUrl.value = product.imagemUrl || "";
    showProductImagePreview(product.imagemUrl, product.imagemUrl ? "Imagem atual" : "");
    document.getElementById("productActive").checked = product.ativo;
    document.getElementById("productSubmit").textContent = "Salvar alterações";
    document.getElementById("productCancelEdit").hidden = false;
    document.getElementById("productName").focus();
    showMessage(`Editando ${product.nome}. As variações e o estoque são gerenciados separadamente.`);
  }

  function clearProductForm() {
    productForm.reset();
    document.getElementById("productId").value = "";
    document.getElementById("productActive").checked = true;
    productImageUrl.value = "";
    showProductImagePreview("", "");
    document.getElementById("productSubmit").textContent = "Cadastrar produto";
    document.getElementById("productCancelEdit").hidden = true;
  }

  function openVariantManager(product) {
    produtoVariacoesId = product.id;
    document.getElementById("variantProductName").textContent = product.nome;
    document.getElementById("variantManager").hidden = false;
    renderVariants(product);
    document.getElementById("variantManagerTitle").focus?.();
  }

  function renderVariants(product) {
    const rows = product.variacoes.map(variation => {
      const row = document.createElement("tr");
      row.append(element("td", String(variation.id)));
      const sizeCell = document.createElement("td");
      const size = document.createElement("input");
      size.value = variation.tamanho;
      size.maxLength = 30;
      size.setAttribute("aria-label", `Tamanho da variação ${variation.id}`);
      sizeCell.append(size);
      row.append(sizeCell);
      const colorCell = document.createElement("td");
      const color = document.createElement("input");
      color.value = variation.cor;
      color.maxLength = 40;
      color.setAttribute("aria-label", `Cor da variação ${variation.id}`);
      colorCell.append(color);
      row.append(colorCell, element("td", String(variation.estoque)));
      const actions = element("td", null, "admin-row-actions");
      const saveVariation = element("button", "Salvar variação", "admin-small-button");
      saveVariation.type = "button";
      saveVariation.addEventListener("click", async () => {
        try {
          await api(`/admin/variacoes/${variation.id}`, {
            method: "PUT",
            body: JSON.stringify({ tamanho: size.value, cor: color.value })
          });
          await loadProducts();
          const updated = produtos.find(item => item.id === produtoVariacoesId);
          if (updated) renderVariants(updated);
          showMessage("Variação atualizada.");
        } catch (error) {
          showMessage(error.message, true);
        }
      });
      const adjustmentType = document.createElement("select");
      adjustmentType.setAttribute("aria-label", `Tipo de ajuste para ${variation.tamanho}, ${variation.cor}`);
      [["entrada", "Entrada"], ["saida", "Saída"], ["ajuste", "Definir total"]].forEach(([value, label]) => {
        const option = element("option", label);
        option.value = value;
        adjustmentType.append(option);
      });
      const quantity = document.createElement("input");
      quantity.type = "number";
      quantity.min = "0";
      quantity.step = "1";
      quantity.value = "1";
      quantity.setAttribute("aria-label", `Quantidade para ${variation.tamanho}, ${variation.cor}`);
      const adjust = element("button", "Salvar estoque", "admin-small-button");
      adjust.type = "button";
      adjust.addEventListener("click", async () => {
        const tipo = adjustmentType.value;
        const amount = Number(quantity.value);
        if (!Number.isSafeInteger(amount) || amount < (tipo === "ajuste" ? 0 : 1)) {
          showMessage("Informe uma quantidade inteira válida.", true);
          return;
        }
        try {
          await api(`/admin/variacoes/${variation.id}/estoque`, {
            method: "PATCH",
            body: JSON.stringify(tipo === "ajuste" ? { tipo, estoque: amount } : { tipo, quantidade: amount })
          });
          await Promise.all([loadProducts(), loadDashboard()]);
          const updated = produtos.find(item => item.id === produtoVariacoesId);
          if (updated) renderVariants(updated);
          showMessage("Estoque atualizado e movimentação registrada.");
        } catch (error) {
          showMessage(error.message, true);
        }
      });
      const remove = element("button", "Remover", "admin-small-button");
      remove.type = "button";
      remove.addEventListener("click", async () => {
        if (!window.confirm("Remover esta variação sem estoque e sem histórico de pedidos?")) return;
        try {
          await api(`/admin/variacoes/${variation.id}`, { method: "DELETE" });
          await loadProducts();
          const updated = produtos.find(item => item.id === produtoVariacoesId);
          if (updated) renderVariants(updated);
          showMessage("Variação removida.");
        } catch (error) {
          showMessage(error.message, true);
        }
      });
      actions.append(saveVariation, adjustmentType, quantity, adjust, remove);
      row.append(actions);
      return row;
    });
    document.getElementById("variantsTable").replaceChildren(
        makeTable(["ID", "Tamanho", "Cor", "Estoque", "Ajustar"],
            rows.length ? rows : [emptyRow(5, "Nenhuma variação cadastrada.")])
    );
  }

  function renderCategories() {
    const rows = categorias.map(category => {
      const row = document.createElement("tr");
      row.append(element("td", String(category.id)));
      const nameCell = document.createElement("td");
      const name = document.createElement("input");
      name.value = category.nome;
      name.maxLength = 80;
      name.setAttribute("aria-label", `Nome da categoria ${category.nome}`);
      nameCell.append(name);
      row.append(nameCell, element("td", String(category.quantidadeProdutos)));
      const status = document.createElement("td");
      const active = document.createElement("input");
      active.type = "checkbox";
      active.checked = category.ativo;
      active.setAttribute("aria-label", `Categoria ${category.nome} ativa`);
      status.append(active);
      row.append(status);
      const actions = element("td", null, "admin-row-actions");
      const save = element("button", "Salvar", "admin-small-button");
      save.type = "button";
      save.addEventListener("click", async () => {
        try {
          await api(`/admin/categorias/${category.id}`, {
            method: "PUT",
            body: JSON.stringify({ nome: name.value, ativo: active.checked })
          });
          await Promise.all([loadCategories(), loadProducts()]);
          showMessage("Categoria atualizada.");
        } catch (error) {
          showMessage(error.message, true);
        }
      });
      const remove = element("button", "Excluir", "admin-small-button");
      remove.type = "button";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Excluir a categoria ${category.nome}?`)) return;
        try {
          await api(`/admin/categorias/${category.id}`, { method: "DELETE" });
          await loadCategories();
          showMessage("Categoria excluída.");
        } catch (error) {
          showMessage(error.message, true);
        }
      });
      actions.append(save, remove);
      row.append(actions);
      return row;
    });
    document.getElementById("categoriesTable").replaceChildren(
        makeTable(["ID", "Nome", "Produtos vinculados", "Ativa", "Ações"],
            rows.length ? rows : [emptyRow(5, "Nenhuma categoria cadastrada.")])
    );
  }

  async function loadOrders() {
    const result = await api("/admin/pedidos");
    const list = document.getElementById("ordersList");
    list.replaceChildren();
    if (!result.pedidos.length) {
      list.append(element("p", "Nenhum pedido cadastrado."));
      return;
    }
    result.pedidos.forEach(order => {
      const card = element("article", null, "order-card");
      const title = element("h3", `Pedido #${order.id} — ${order.status}`);
      const detail = element("p", `${order.cliente} · ${new Date(order.criadoEm).toLocaleString("pt-BR")} · ${money(order.total)}`);
      const lines = element("ul");
      order.itens.forEach(item => lines.append(element("li", `${item.quantidade} × ${item.produto} (${item.tamanho}, ${item.cor}) — ${money(item.precoUnitario)}`)));
      card.append(title, detail, lines);
      if (order.status === "pendente") {
        const confirm = element("button", "Confirmar pedido e baixar estoque", "admin-small-button");
        confirm.type = "button";
        confirm.addEventListener("click", async () => {
          if (!window.confirm("Confirmar este pedido? A operação registrará a saída do estoque. Isso não confirma pagamento.")) return;
          try {
            await api(`/admin/pedidos/${order.id}/confirmar`, { method: "POST" });
            await Promise.all([loadOrders(), loadDashboard()]);
            showMessage("Pedido confirmado e estoque atualizado.");
          } catch (error) {
            showMessage(error.message, true);
          }
        });
        card.append(confirm);
      }
      list.append(card);
    });
  }

  async function loadMovements() {
    const result = await api("/admin/movimentacoes");
    document.getElementById("stockMovements").replaceChildren(
        makeTable(["Data", "Produto / variação", "Tipo", "Quantidade", "Responsável"],
            result.movimentacoes.length
                ? result.movimentacoes.map(movementRow)
                : [emptyRow(5, "Nenhuma movimentação registrada.")])
    );
  }

  document.getElementById("adminLogout").addEventListener("click", () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    window.location.replace("areadelogin.html");
  });

  document.querySelectorAll(".admin-tab").forEach(button => {
    button.addEventListener("click", async () => {
      document.querySelectorAll(".admin-tab").forEach(tab => {
        const active = tab === button;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-pressed", String(active));
      });
      document.querySelectorAll(".admin-section").forEach(section => {
        section.hidden = section.id !== `section-${button.dataset.section}`;
      });
      try {
        if (button.dataset.section === "dashboard") await loadDashboard();
        if (button.dataset.section === "products") await Promise.all([loadCategories(), loadProducts()]);
        if (button.dataset.section === "categories") await loadCategories();
        if (button.dataset.section === "orders") await loadOrders();
        if (button.dataset.section === "stock") await loadMovements();
      } catch (error) {
        showMessage(error.message, true);
      }
    });
  });

  productForm.addEventListener("submit", async event => {
    event.preventDefault();
    const id = document.getElementById("productId").value;
    const data = new FormData();
    data.append("nome", document.getElementById("productName").value);
    data.append("descricao", document.getElementById("productDescription").value);
    data.append("preco", document.getElementById("productPrice").value);
    data.append("categoriaId", document.getElementById("productCategory").value);
    data.append("imagemUrl", productImageUrl.value);
    data.append("ativo", String(document.getElementById("productActive").checked));
    if (productImageInput.files[0]) data.append("imagem", productImageInput.files[0]);
    try {
      await api(id ? `/admin/produtos/${id}` : "/admin/produtos", {
        method: id ? "PUT" : "POST",
        body: data
      });
      clearProductForm();
      await Promise.all([loadProducts(), loadDashboard()]);
      showMessage(id ? "Produto atualizado." : "Produto cadastrado.");
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  document.getElementById("productCancelEdit").addEventListener("click", clearProductForm);
  document.getElementById("variantForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!produtoVariacoesId) return;
    try {
      await api(`/admin/produtos/${produtoVariacoesId}/variacoes`, {
        method: "POST",
        body: JSON.stringify({
          tamanho: document.getElementById("variantSize").value,
          cor: document.getElementById("variantColor").value,
          estoque: Number(document.getElementById("variantStock").value)
        })
      });
      event.target.reset();
      document.getElementById("variantStock").value = "0";
      await loadProducts();
      const product = produtos.find(item => item.id === produtoVariacoesId);
      if (product) renderVariants(product);
      showMessage("Variação adicionada.");
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  document.getElementById("categoryForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
      await api("/admin/categorias", {
        method: "POST",
        body: JSON.stringify({ nome: document.getElementById("categoryName").value })
      });
      event.target.reset();
      await loadCategories();
      showMessage("Categoria criada.");
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  async function start() {
    if (!token) {
      window.location.replace("areadelogin.html");
      return;
    }
    try {
      const session = await api("/auth/me");
      if (session.usuario?.perfil !== "admin") {
        accessMessage.querySelector("h1").textContent = "Acesso não autorizado";
        accessMessage.querySelector("p").textContent = "Sua conta não possui permissão administrativa.";
        return;
      }
      document.getElementById("adminGreeting").textContent = `Olá, ${session.usuario.nome}`;
      accessMessage.hidden = true;
      content.hidden = false;
      await Promise.all([loadCategories(), loadProducts(), loadDashboard()]);
    } catch (error) {
      if (!error.message.startsWith("Sua sessão expirou")) showMessage(error.message, true);
      accessMessage.querySelector("h1").textContent = "Não foi possível validar o acesso";
      accessMessage.querySelector("p").textContent = error.message;
    }
  }

  start();
})();
