(() => {
  "use strict";

  const slides = [
    { image: "camisa_brooklyn.jpg", alt: "Camiseta Brooklyn da coleção MBV StreetView" },
    { image: "camisa_pain.jpg", alt: "Camiseta Pain da coleção MBV StreetView" },
    { image: "camisa_desenho_coasta.jpg", alt: "Camiseta Galaxy da coleção MBV StreetView" },
    { image: "camisa_anjo.jpg", alt: "Camiseta Anjelical da coleção MBV StreetView" },
    { image: "bone_street.jpg", alt: "Boné Street da coleção MBV StreetView" },
    { image: "bone_bones.jpg", alt: "Boné Ossos da coleção MBV StreetView" },
    { image: "jaqueta_nike.jpg", alt: "Jaqueta Nike da coleção MBV StreetView" },
    { image: "camisa_onepiace.jpg", alt: "Camiseta Zoro One Piece da coleção MBV StreetView" }
  ];
  const duration = 5000;

  function initializeCarousel(carousel, carouselSlides) {
    const image = carousel.querySelector("[data-carousel-image]");
    const count = carousel.querySelector("[data-carousel-count]");
    const status = carousel.querySelector("[data-carousel-status]");
    const progressBar = carousel.querySelector("[data-carousel-progress]");
    const progress = progressBar?.querySelector("span");
    const previous = carousel.querySelector("[data-carousel-previous]");
    const next = carousel.querySelector("[data-carousel-next]");
    const imageBase = carousel.dataset.imageBase;

    if (!image || !count || !status || !progressBar || !progress || !previous || !next || !imageBase || !carouselSlides.length) return;

    let index = 0;
    let timer = null;
    let progressTimer = null;
    let startedAt = 0;
    let remaining = duration;

    function showSlide(nextIndex, announce = true) {
      index = (nextIndex + carouselSlides.length) % carouselSlides.length;
      const slide = carouselSlides[index];
      image.src = new URL(slide.image, new URL(imageBase, document.baseURI)).href;
      image.alt = slide.alt;
      count.textContent = `MBV / ${String(index + 1).padStart(3, "0")}`;
      if (announce) status.textContent = `Imagem ${index + 1} de ${carouselSlides.length}: ${slide.alt}`;
    }

    function updateProgress() {
      const value = Math.min(100, Math.round(((duration - remaining) / duration) * 100));
      progress.style.width = `${value}%`;
      progressBar.setAttribute("aria-valuenow", String(value));
    }

    function stopTimer() {
      if (timer) window.clearTimeout(timer);
      if (progressTimer) window.clearInterval(progressTimer);
      timer = null;
      progressTimer = null;
      if (startedAt) {
        remaining = Math.max(0, remaining - (Date.now() - startedAt));
        startedAt = 0;
      }
      updateProgress();
    }

    function startTimer() {
      if (document.hidden || carousel.closest("[hidden]") || timer) return;
      startedAt = Date.now();
      timer = window.setTimeout(() => {
        timer = null;
        startedAt = 0;
        remaining = duration;
        showSlide(index + 1, false);
        updateProgress();
        startTimer();
      }, remaining);
      progressTimer = window.setInterval(() => {
        remaining = Math.max(0, duration - (Date.now() - startedAt));
        updateProgress();
      }, 100);
    }

    function refreshTimer() {
      if (document.hidden || carousel.closest("[hidden]")) {
        stopTimer();
      } else {
        startTimer();
      }
    }

    function restartTimer() {
      stopTimer();
      remaining = duration;
      updateProgress();
      refreshTimer();
    }

    previous.addEventListener("click", () => {
      showSlide(index - 1);
      restartTimer();
    });
    next.addEventListener("click", () => {
      showSlide(index + 1);
      restartTimer();
    });

    const hiddenContainer = carousel.closest("[hidden]");
    if (hiddenContainer) {
      new MutationObserver(refreshTimer).observe(hiddenContainer, {
        attributes: true,
        attributeFilter: ["hidden"]
      });
    }

    document.addEventListener("visibilitychange", refreshTimer);
    showSlide(0, false);
    updateProgress();
    refreshTimer();
  }

  async function loadCatalogSlides() {
    try {
      const response = await fetch(`${window.MBV_API_URL}/produtos`, {
        headers: window.MBV_API_HEADERS || {}
      });
      if (!response.ok) throw new Error(`Catálogo indisponível (HTTP ${response.status}).`);
      const result = await response.json();
      const catalogSlides = Array.isArray(result.produtos)
          ? result.produtos
              .filter(product => typeof product.imagemUrl === "string" && product.imagemUrl.trim())
              .map(product => {
                const imageUrl = new URL(product.imagemUrl, document.baseURI);
                if (!["http:", "https:"].includes(imageUrl.protocol)) return null;
                return { image: imageUrl.href, alt: product.nome };
              })
              .filter(slide => slide && typeof slide.alt === "string" && slide.alt.trim())
          : [];
      return catalogSlides.length ? catalogSlides : slides;
    } catch (error) {
      console.warn("Não foi possível carregar as imagens atuais do catálogo para o carrossel:", error.message);
      return slides;
    }
  }

  const carousels = [...document.querySelectorAll("[data-carousel]")];
  if (carousels.length) {
    loadCatalogSlides().then(catalogSlides => {
      carousels.forEach(carousel => initializeCarousel(carousel, catalogSlides));
    });
  }
})();
