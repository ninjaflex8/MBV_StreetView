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
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("[data-carousel]").forEach(carousel => {
    const image = carousel.querySelector("[data-carousel-image]");
    const count = carousel.querySelector("[data-carousel-count]");
    const status = carousel.querySelector("[data-carousel-status]");
    const progressBar = carousel.querySelector("[data-carousel-progress]");
    const progress = progressBar?.querySelector("span");
    const toggle = carousel.querySelector("[data-carousel-toggle]");
    const previous = carousel.querySelector("[data-carousel-previous]");
    const next = carousel.querySelector("[data-carousel-next]");
    const imageBase = carousel.dataset.imageBase;

    if (!image || !count || !status || !progressBar || !progress || !toggle || !previous || !next || !imageBase) return;

    let index = 0;
    let timer = null;
    let progressTimer = null;
    let startedAt = 0;
    let remaining = duration;
    let manuallyPaused = reducedMotion.matches;
    let focusPaused = false;

    function showSlide(nextIndex, announce = true) {
      index = (nextIndex + slides.length) % slides.length;
      const slide = slides[index];
      image.src = new URL(`${imageBase}${slide.image}`, document.baseURI).href;
      image.alt = slide.alt;
      count.textContent = `MBV / ${String(index + 1).padStart(3, "0")}`;
      if (announce) status.textContent = `Imagem ${index + 1} de ${slides.length}: ${slide.alt}`;
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
      if (manuallyPaused || focusPaused || document.hidden || carousel.matches(":hover") || timer) return;
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
      toggle.textContent = manuallyPaused ? "▶" : "Ⅱ";
      toggle.setAttribute("aria-label", manuallyPaused ? "Iniciar carrossel" : "Pausar carrossel");
      if (manuallyPaused || focusPaused || document.hidden || carousel.closest("[hidden]") || carousel.matches(":hover")) {
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
    toggle.addEventListener("click", () => {
      manuallyPaused = !manuallyPaused;
      refreshTimer();
    });
    carousel.addEventListener("mouseenter", refreshTimer);
    carousel.addEventListener("mouseleave", refreshTimer);
    carousel.addEventListener("focusin", () => {
      focusPaused = true;
      refreshTimer();
    });
    carousel.addEventListener("focusout", event => {
      if (!carousel.contains(event.relatedTarget)) {
        focusPaused = false;
        refreshTimer();
      }
    });
    const hiddenContainer = carousel.closest("[hidden]");
    if (hiddenContainer) {
      new MutationObserver(refreshTimer).observe(hiddenContainer, {
        attributes: true,
        attributeFilter: ["hidden"]
      });
    }
    document.addEventListener("visibilitychange", refreshTimer);
    reducedMotion.addEventListener("change", event => {
      manuallyPaused = event.matches;
      refreshTimer();
    });

    showSlide(0, false);
    updateProgress();
    refreshTimer();
  });
})();
