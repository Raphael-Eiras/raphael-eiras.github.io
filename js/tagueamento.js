/* tagueamento.js - GTAG version (robusto e validado) */
(function () {
  const GA4_ID = "G-096NHNN8Q2";
  const BLOCKED_IDS = ["G-BZXLFW2C48"]; // impede carregamento indevido

  // Bloqueia outras propriedades GA4/GTM antes de carregar o nosso
  document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').forEach(s => {
    if (BLOCKED_IDS.some(id => s.src.includes(id))) {
      console.warn("🚫 Bloqueando carregamento indevido:", s.src);
      s.remove();
    }
  });

  // Redefine dataLayer isolado
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };

  // Carrega script GA4 com DEFER para garantir ordem
  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_ID}"]`)) {
    const s = document.createElement("script");
    s.defer = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s);
  }

  // Config inicial + page_view quando tudo estiver carregado
  function initGA() {
    try {
      gtag("js", new Date());
      gtag("config", GA4_ID, { send_page_view: false });
      sendPageView();
    } catch (e) {
      console.warn("Aguardando GA4 carregar...", e);
      setTimeout(initGA, 500);
    }
  }

  // Função garantida de page_view
  function sendPageView() {
    const payload = { page_location: location.href, engagement_time_msec: 1 };
    gtag("event", "page_view", payload);
    if (window.__DEBUG_GTAG) console.log("✅ page_view enviado:", payload);
  }

  // Envia page_view após o load completo
  window.addEventListener("load", initGA);

  // Reenvia page_view ao trocar de página (navegação interna)
  window.addEventListener("popstate", sendPageView);

  /* === Função utilitária para eventos === */
  function track(name, params) {
    const payload = Object.assign({ page_location: location.href }, params || {});
    gtag("event", name, payload);
    if (window.__DEBUG_GTAG)
      console.log("➡️ Enviado:", name, payload);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.__GA4_BOUND) return;
    window.__GA4_BOUND = true;

    /* === MENU === */
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

    /* === ANÁLISE === */
    if (document.body.classList.contains("analise")) {
      const cards = document.querySelectorAll(".card-link, .card a, .btn, .vermais, .card-montadoras a");
      const labels = ["lorem", "ipsum", "dolor", "amet"];
      cards.forEach((btn, i) => {
        btn.addEventListener("click", () => {
          const name = labels[i] || btn.innerText.trim().toLowerCase() || "conteudo";
          track("click", { element_group: "ver_mais", element_name: name });
        });
      });
    }

    /* === SOBRE === */
    if (document.body.classList.contains("sobre")) {
      const form = document.querySelector("form.contato") || document.querySelector("form");
      if (!form) return;

      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      const meta = {
        form_id: form.id || "",
        form_name: form.getAttribute("name") || "contato",
        form_destination: form.getAttribute("action") || (location.origin + location.pathname + "#contato"),
      };

      let started = false, successSent = false;
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

      form.addEventListener("submit", (e) => {
        const txt =
          (submitBtn &&
            (submitBtn.value || submitBtn.innerText || submitBtn.textContent)) ||
          "enviar";
        track("form_submit", Object.assign({}, meta, {
          form_submit_text: String(txt).trim().toLowerCase(),
        }));

        setTimeout(() => {
          if (!successSent) {
            successSent = true;
            track("view_form_success", meta);
          }
        }, 800);
      });
    }
  });
})();
