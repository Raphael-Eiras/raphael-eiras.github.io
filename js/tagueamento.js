/* ============================================================
   tagueamento-v3.js
   Implementação completa de rastreamento via gtag (GA4)
   Autor: Raphael Eiras - Case Técnico DP6
   Propriedade ativa: G-096NHNN8Q2
   ============================================================ */

(function () {
  const GA4_ID = "G-096NHNN8Q2";
  const BLOCKED_IDS = ["G-BZXLFW2C48"];
  const MAX_TEXT = 160;

  // === Debug helper ===
  function dbg(...args) {
    if (window.__DEBUG_GTAG) console.log("[TAGUEAMENTO]", ...args);
  }

  // === Block any GA4 script from blocked IDs ===
  (function interceptGA() {
    const origCreate = document.createElement;
    document.createElement = function (tag, opts) {
      const el = origCreate.call(document, tag, opts);
      if (tag.toLowerCase() === "script") {
        const origSet = el.setAttribute;
        el.setAttribute = function (name, value) {
          if (name === "src" && typeof value === "string") {
            for (const id of BLOCKED_IDS) {
              if (value.includes(id)) {
                dbg("⚠️ Bloqueado script GA:", value);
                return origSet.call(this, name, ""); // neutraliza
              }
            }
          }
          return origSet.call(this, name, value);
        };
      }
      return el;
    };
    dbg("Intercepção de GA inicializada");
  })();

  // === Loader do GA4 correto ===
  function loadGA() {
    if (window.__GA_LOADED) return;
    window.__GA_LOADED = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    s.onload = initGA;
    document.head.appendChild(s);
  }

  // === Inicialização do GA ===
  function initGA() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", GA4_ID, { send_page_view: false });
    dbg("✅ GA inicializado:", GA4_ID);
    sendPageView();
  }

  // === Envio de page_view confiável ===
  function sendPageView(extra = {}) {
    try {
      const params = Object.assign({ page_location: location.href }, extra);
      gtag("event", "page_view", params);
      dbg("📄 page_view", params);
    } catch {
      setTimeout(() => sendPageView(extra), 300);
    }
  }

  // === Extração de informações de elemento ===
  function getElInfo(el) {
    if (!el) return {};
    const tag = (el.tagName || "").toLowerCase();
    const id = el.id || "";
    const classes = el.className ? String(el.className).trim() : "";
    const href = el.getAttribute && el.getAttribute("href") || "";
    let text = (el.innerText || el.textContent || "").trim();
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT) + "...";
    const dataset = el.dataset ? JSON.stringify(el.dataset) : "{}";
    return { element_tag: tag, element_id: id, element_classes: classes, element_href: href, element_text: text, element_dataset: dataset };
  }

  // === Envio genérico de evento ===
  function sendEvent(eventName, params) {
    params.page_location = location.href;
    try {
      gtag("event", eventName, params);
      dbg("🎯 evento:", eventName, params);
    } catch {
      setTimeout(() => sendEvent(eventName, params), 300);
    }
  }

  // === Captura global de cliques ===
  function onGlobalClick(ev) {
    const path = ev.composedPath ? ev.composedPath() : (ev.path || []);
    const el = path.find(n => n.tagName) || ev.target;
    if (!el) return;
    const info = getElInfo(el);
    let eventName = "click";

    // Regra: downloads PDF
    if (info.element_href.match(/\.pdf/i)) {
      eventName = "file_download";
    }

    // Regra: hash link (#)
    if (info.element_href.includes("#")) {
      eventName = "anchor_hash";
      info.element_name = info.element_href.split("#")[1] || "hash_link";
    }

    // Regra: menu
    if (info.element_classes.includes("menu-lista-contato")) {
      info.element_group = "menu";
      info.element_name = "entre_em_contato";
    } else if (info.element_classes.includes("menu-lista-download")) {
      eventName = "file_download";
      info.element_group = "menu";
      info.element_name = "download_pdf";
    }

    // Regra: cards de análise
    if (document.body.classList.contains("analise")) {
      let a = el;
      while (a && a !== document) {
        if (a.classList && (a.classList.contains("card") || a.classList.contains("card-link"))) {
          info.element_group = "ver_mais";
          info.element_name = info.element_text.toLowerCase() || "conteudo";
          break;
        }
        a = a.parentElement;
      }
    }

    sendEvent(eventName, info);
  }

  // === Rastreamento de formulários ===
  function trackForms() {
    document.querySelectorAll("form").forEach(form => {
      if (form.__tracked) return;
      form.__tracked = true;

      const meta = {
        form_id: form.id || "",
        form_name: form.getAttribute("name") || "form",
        form_destination: form.getAttribute("action") || location.href
      };

      let started = false;
      form.querySelectorAll("input, textarea, select").forEach(i => {
        i.addEventListener("focus", () => {
          if (!started) {
            started = true;
            sendEvent("form_start", meta);
          }
        }, { passive: true });
      });

      form.addEventListener("submit", () => {
        const btn = form.querySelector('[type="submit"]');
        const txt = btn ? (btn.value || btn.innerText || "").trim().toLowerCase() : "enviar";
        sendEvent("form_submit", Object.assign({}, meta, { form_submit_text: txt }));

        setTimeout(() => {
          const ok = document.querySelector(".form-success, .alert-success, .mensagem-sucesso, #sucesso");
          sendEvent("view_form_success", meta);
        }, 800);
      });
    });
  }

  // === Inicialização principal ===
  function init() {
    dbg("🔄 Inicializando tagueamento v3");
    loadGA();
    document.addEventListener("click", onGlobalClick, true);
    trackForms();

    // Monitor de formulários dinâmicos
    const obs = new MutationObserver(trackForms);
    obs.observe(document.body, { childList: true, subtree: true });

    // Page_view em mudanças de hash ou histórico
    window.addEventListener("hashchange", () => sendPageView({ reason: "hashchange" }));
    window.addEventListener("popstate", () => sendPageView({ reason: "popstate" }));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") sendPageView({ reason: "visible" });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
