/* tagueamento.js - GTAG versão final e blindada */
(function () {
  const GA4_ID = "G-096NHNN8Q2";
  const BLOCKED_IDS = ["G-BZXLFW2C48"];
  window.dataLayer = window.dataLayer || [];

  // 🔒 BLOQUEIO PROATIVO – intercepta qualquer tentativa de carregar gtag.js de outro ID
  const originalCreateElement = document.createElement;
  document.createElement = function (tagName, options) {
    const element = originalCreateElement.call(this, tagName, options);
    if (tagName.toLowerCase() === "script") {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function (name, value) {
        if (name === "src" && typeof value === "string") {
          if (BLOCKED_IDS.some(id => value.includes(id))) {
            console.warn("🚫 Bloqueado script GA4 não autorizado:", value);
            value = ""; // anula o carregamento
          }
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    return element;
  };

  // 🔄 Reconfigura o gtag isolado
  window.gtag = window.gtag || function () {
    dataLayer.push(arguments);
  };

  // 🔽 Carrega o GA4 correto de forma controlada
  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_ID}"]`)) {
    const s = document.createElement("script");
    s.defer = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s);
  }

  // 📄 Envio confiável de page_view
  function sendPageView() {
    const payload = { page_location: location.href };
    gtag("event", "page_view", payload);
    if (window.__DEBUG_GTAG) console.log("✅ page_view enviado:", payload);
  }

  // 🧩 Inicialização segura
  function initGA() {
    try {
      gtag("js", new Date());
      gtag("config", GA4_ID, { send_page_view: false });
      sendPageView();
    } catch (e) {
      console.warn("⏳ GA4 ainda não pronto, tentando novamente...");
      setTimeout(initGA, 600);
    }
  }

  window.addEventListener("load", initGA);
  window.addEventListener("popstate", sendPageView);

  // 🚀 Função utilitária para eventos
  function track(name, params) {
    const payload = Object.assign({ page_location: location.href }, params || {});
    gtag("event", name, payload);
    if (window.__DEBUG_GTAG) console.log("➡️ Enviado:", name, payload);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.__GA4_BOUND) return;
    window.__GA4_BOUND = true;

    /* ===== MENU ===== */
    const contato = document.querySelector(".menu-lista-contato");
    const download = document.querySelector(".menu-lista-download");
    if (contato) contato.addEventListener("click", () =>
      track("click", { element_group: "menu", element_name: "entre_em_contato" })
    );
    if (download) download.addEventListener("click", () =>
      track("file_download", { element_group: "menu", element_name: "download_pdf" })
    );

    /* ===== ANÁLISE (Lorem Ipsum) ===== */
    if (document.body.classList.contains("analise")) {
      const cards = document.querySelectorAll(
        ".card-link, .card a, .btn, .vermais, .card-montadoras a, .card-item a, button, a[onclick]"
      );
      const labels = ["lorem", "ipsum", "dolor", "amet"];
      cards.forEach((btn, i) => {
        btn.addEventListener("click", () => {
          let label = btn.innerText.trim().toLowerCase();
          if (!label || label.length < 3) label = labels[i] || "conteudo";
          track("click", { element_group: "ver_mais", element_name: label });
        });
      });
    }

    /* ===== SOBRE (Formulário) ===== */
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

      let started = false, successSent = false;
      const onStart = () => {
        if (started) return;
        started = true;
        track("form_start", meta);
      };

      form.querySelectorAll("input, textarea, select").forEach(el => {
        ["focus", "input", "change"].forEach(ev =>
          el.addEventListener(ev, onStart, { passive: true })
        );
      });

      form.addEventListener("submit", () => {
        const txt = (submitBtn?.value || submitBtn?.innerText || "enviar").trim().toLowerCase();
        track("form_submit", { ...meta, form_submit_text: txt });
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
