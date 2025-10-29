/* tagueamento.js - GTAG version (corrigido e estável) */
(function () {
  const GA4_ID = "G-096NHNN8Q2";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    dataLayer.push(arguments);
  };

  // Carrega script do GA4 e envia page_view somente após o load
  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_ID}"]`)) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s);

    s.onload = () => {
      gtag("js", new Date());
      gtag("config", GA4_ID, { send_page_view: false });
      sendPageView(); // só envia depois do carregamento
    };
  } else {
    gtag("config", GA4_ID, { send_page_view: false });
    sendPageView();
  }

  // Função robusta de page_view
  function sendPageView() {
    const payload = { page_location: location.href };
    gtag("event", "page_view", payload);
    if (window.__DEBUG_GTAG)
      console.log("✅ page_view enviado", payload);
  }

  // Função utilitária para enviar eventos
  function track(name, params) {
    const payload = Object.assign({ page_location: location.href }, params || {});
    gtag("event", name, payload);
    if (window.__DEBUG_GTAG)
      console.log("➡️ Enviado:", name, payload);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.__GA4_BOUND) return;
    window.__GA4_BOUND = true;

    /* ========== MENU ========== */
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

    /* ========== ANÁLISE (“Lorem Ipsum”) ========== */
    if (document.body.classList.contains("analise")) {
      // Captura qualquer botão/link nos cards
      const cards = document.querySelectorAll(".card-link, .card a, .btn, .vermais, .card-montadoras a");
      const labels = ["lorem", "ipsum", "dolor", "amet"];
      cards.forEach((btn, i) => {
        btn.addEventListener("click", () => {
          const name = labels[i] || btn.innerText.trim().toLowerCase() || "conteudo";
          track("click", { element_group: "ver_mais", element_name: name });
        });
      });
    }

    /* ========== SOBRE (Formulário) ========== */
    if (document.body.classList.contains("sobre")) {
      const form = document.querySelector("form.contato") || document.querySelector("form");
      if (!form) return;

      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      const meta = {
        form_id: form.id || "",
        form_name: form.getAttribute("name") || "contato",
        form_destination:
          form.getAttribute("action") || (location.origin + location.pathname + "#contato"),
      };

      let started = false,
        submitted = false,
        successSent = false;

      function onStart() {
        if (started) return;
        started = true;
        track("form_start", meta);
      }

      form.querySelectorAll("input, textarea, select").forEach((el) => {
        ["focus", "input", "change"].forEach((ev) =>
          el.addEventListener(ev, onStart, { passive: true })
        );
      });

      form.addEventListener("submit", () => {
        submitted = true;
        const txt =
          (submitBtn &&
            (submitBtn.value || submitBtn.innerText || submitBtn.textContent)) ||
          "enviar";
        track("form_submit", Object.assign({}, meta, {
          form_submit_text: String(txt).trim().toLowerCase(),
        }));

        // Envia view_form_success garantido
        setTimeout(() => {
          if (!successSent) {
            successSent = true;
            track("view_form_success", meta);
          }
        }, 800);
      });
    }

    /* ========== PAGE VIEW NA TROCA DE PÁGINA (ex: SPA / navegação interna) ========== */
    window.addEventListener("popstate", sendPageView);
  });
})();
