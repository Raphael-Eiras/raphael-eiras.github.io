/* =======================================================
   TAGUEAMENTO DP6 – VERSÃO FINAL (GA4 G-096NHNN8Q2)
   Ambiente: GitHub Pages
   Autor: Raphael Eiras (implementação)
   ======================================================= */

(function () {
  const GA4_ID = "G-096NHNN8Q2";
  const BLOCKED_IDS = ["G-BZXLFW2C48", "GTM-PTTTCJGS"];
  window.dataLayer = window.dataLayer || [];

  /* =======================================================
     BLOQUEIO DE SCRIPTS INDEVIDOS (GA4 / GTM errados)
  ======================================================= */
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (
          node.tagName === "SCRIPT" &&
          node.src &&
          BLOCKED_IDS.some((id) => node.src.includes(id))
        ) {
          console.warn("🚫 Script bloqueado:", node.src);
          node.remove();
        }
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  /* =======================================================
     INICIALIZAÇÃO DO GA4
  ======================================================= */
  function loadGA4() {
    const existing = document.querySelector(
      `script[src*="googletagmanager.com/gtag/js?id=${GA4_ID}"]`
    );
    if (existing) return initGA4();

    const s = document.createElement("script");
    s.defer = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    s.onload = initGA4;
    document.head.appendChild(s);
  }

  function initGA4() {
    window.gtag = window.gtag || function () {
      dataLayer.push(arguments);
    };
    gtag("js", new Date());
    gtag("config", GA4_ID, { send_page_view: false });
    sendPageView();
  }

  /* =======================================================
     ENVIO DE EVENTOS
  ======================================================= */
  function sendPageView() {
    const payload = { page_location: location.href };
    gtag("event", "page_view", payload);
    if (window.__DEBUG_GTAG) console.log("📄 page_view:", payload);
  }

  function track(eventName, params) {
    const payload = Object.assign({ page_location: location.href }, params || {});
    gtag("event", eventName, payload);
    if (window.__DEBUG_GTAG)
      console.log("🎯 evento:", eventName, payload);
  }

  /* =======================================================
     TAGUEAMENTO – AO CARREGAR O DOM
  ======================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    // PAGEVIEW no carregamento
    loadGA4();

    /* ========= MENU ========= */
    const contato = document.querySelector(".menu-lista-contato");
    const download = document.querySelector(".menu-lista-download");

    if (contato)
      contato.addEventListener("click", () => {
        track("click", { element_group: "menu", element_name: "entre_em_contato" });
      });

    if (download)
      download.addEventListener("click", () => {
        track("file_download", { element_group: "menu", element_name: "download_pdf" });
      });

    /* ========= ANÁLISE ========= */
    if (document.body.classList.contains("analise")) {
      const labels = ["lorem", "ipsum", "dolor", "amet"];
      const cards = document.querySelectorAll(
        ".card-link, .card a, .card-item a, .btn, .vermais, .card-montadoras a, button, a[onclick]"
      );

      cards.forEach((btn, i) => {
        btn.addEventListener("click", () => {
          const name =
            labels[i] ||
            (btn.innerText || btn.textContent || "conteudo").trim().toLowerCase();
          track("click", { element_group: "ver_mais", element_name: name });
        });
      });
    }

    /* ========= SOBRE (FORMULÁRIO) ========= */
    if (document.body.classList.contains("sobre")) {
      const form = document.querySelector("form") || document.querySelector("form.contato");
      if (!form) return;

      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      const meta = {
        form_id: form.id || "",
        form_name: form.getAttribute("name") || "contato",
        form_destination:
          form.getAttribute("action") || (location.origin + location.pathname + "#contato"),
      };

      let started = false;
      let successSent = false;

      function startForm() {
        if (started) return;
        started = true;
        track("form_start", meta);
      }

      form.querySelectorAll("input, textarea, select").forEach((el) => {
        ["focus", "input", "change"].forEach((ev) =>
          el.addEventListener(ev, startForm, { passive: true })
        );
      });

      form.addEventListener("submit", () => {
        const txt =
          (submitBtn?.value || submitBtn?.innerText || "enviar").trim().toLowerCase();
        track("form_submit", { ...meta, form_submit_text: txt });

        // Simula mensagem de sucesso (caso não haja retorno do servidor)
        setTimeout(() => {
          if (!successSent) {
            successSent = true;
            track("view_form_success", meta);
          }
        }, 800);
      });
    }

    /* ========= TROCA DE PÁGINA ========= */
    window.addEventListener("popstate", sendPageView);
  });
})();
