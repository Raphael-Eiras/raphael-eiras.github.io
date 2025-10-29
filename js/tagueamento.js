/* ============================================================
   tagueamento-v4.js
   Versão final consolidada - DP6 Case Técnico
   Corrige textos duplicados, evita falhas de timing e garante
   uniformidade em todos os eventos.
   ============================================================ */

(function () {
  const GA4_ID = "G-096NHNN8Q2";
  const BLOCKED_IDS = ["G-BZXLFW2C48"];
  const MAX_TEXT = 160;

  /* ---------- UTILITÁRIOS ---------- */

  const dbg = (...args) => window.__DEBUG_GTAG && console.log("[TAGUEAMENTO]", ...args);

  // Remove e bloqueia scripts GA indesejados
  (function blockGA() {
    const origCreate = document.createElement;
    document.createElement = function (tag, opts) {
      const el = origCreate.call(document, tag, opts);
      if (tag.toLowerCase() === "script") {
        const origSet = el.setAttribute;
        el.setAttribute = function (name, value) {
          if (name === "src" && typeof value === "string") {
            for (const id of BLOCKED_IDS)
              if (value.includes(id)) {
                dbg("🚫 Bloqueado script GA:", value);
                return origSet.call(this, name, "");
              }
          }
          return origSet.call(this, name, value);
        };
      }
      return el;
    };
  })();

  /* ---------- INICIALIZAÇÃO DO GTAG ---------- */

  function loadGA() {
    if (window.__GA_LOADED) return;
    window.__GA_LOADED = true;

    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    s.onload = initGA;
    document.head.appendChild(s);
  }

  function initGA() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", GA4_ID, { send_page_view: false });
    dbg("✅ GA4 inicializado:", GA4_ID);
    sendPageView();
  }

  function sendPageView(extra = {}) {
    const params = { page_location: location.href, ...extra };
    try {
      gtag("event", "page_view", params);
      dbg("📄 page_view", params);
    } catch {
      setTimeout(() => sendPageView(extra), 300);
    }
  }

  /* ---------- CAPTURA DE ELEMENTOS ---------- */

  function getElInfo(el) {
    if (!el) return {};
    const tag = (el.tagName || "").toLowerCase();
    const id = el.id || "";
    const classes = el.className ? String(el.className).trim() : "";
    const href = el.getAttribute?.("href") || "";
    let text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT) + "...";
    const dataset = el.dataset ? JSON.stringify(el.dataset) : "{}";
    return { element_tag: tag, element_id: id, element_classes: classes, element_href: href, element_text: text, element_dataset: dataset };
  }

  function getCardName(cardEl) {
    if (!cardEl) return "conteudo";
    if (cardEl.dataset?.name) return cardEl.dataset.name.trim().toLowerCase();
    const title = cardEl.querySelector("h3, h2, h4, strong, .titulo, .title");
    if (title?.textContent.trim()) return title.textContent.trim().toLowerCase();
    return (cardEl.innerText || "").split("\n")[0].trim().toLowerCase();
  }

  /* ---------- ENVIO GENÉRICO DE EVENTOS ---------- */

  function sendEvent(name, params) {
    const payload = { page_location: location.href, ...params };
    try {
      gtag("event", name, payload);
      dbg("🎯 evento", name, payload);
    } catch {
      setTimeout(() => sendEvent(name, payload), 300);
    }
  }

  /* ---------- CLICK TRACKING ---------- */

  function onGlobalClick(ev) {
    const path = ev.composedPath ? ev.composedPath() : (ev.path || []);
    const el = path.find(n => n.tagName) || ev.target;
    if (!el) return;

    const info = getElInfo(el);
    let eventName = "click";

    // --- MENU
    if (info.element_classes.includes("menu-lista-contato")) {
      info.element_group = "menu";
      info.element_name = "entre_em_contato";
    } else if (info.element_classes.includes("menu-lista-download")) {
      eventName = "file_download";
      info.element_group = "menu";
      info.element_name = "download_pdf";
    }

    // --- HASH LINKS (#)
    if (info.element_href.includes("#")) {
      eventName = "anchor_hash";
      info.element_group = "link";
      info.element_name = info.element_href.split("#")[1] || "hash_link";
    }

    // --- DOWNLOADS
    if (info.element_href.match(/\.(pdf|zip|docx?|xlsx?)$/i)) {
      eventName = "file_download";
      info.element_group = "download";
      info.element_name = info.element_href.split("/").pop();
      ev.preventDefault();
      setTimeout(() => window.location.href = info.element_href, 350);
    }

    // --- CARDS (ver_mais)
    if (document.body.classList.contains("analise")) {
      const card = el.closest(".card");
      if (card) {
        info.element_group = "ver_mais";
        info.element_name = getCardName(card);
      }
    }

    // --- BOTÕES GENÉRICOS
    if (!info.element_group) {
      info.element_group = "geral";
      info.element_name = info.element_text.toLowerCase() || info.element_id || "botao";
    }

    sendEvent(eventName, info);
  }

  /* ---------- FORMULÁRIOS ---------- */

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

      form.addEventListener("submit", e => {
        const btn = form.querySelector('[type="submit"]');
        const txt = btn ? (btn.value || btn.innerText || "").trim().toLowerCase() : "enviar";
        sendEvent("form_submit", { ...meta, form_submit_text: txt });
        setTimeout(() => sendEvent("view_form_success", meta), 800);
      });
    });
  }

  /* ---------- INICIALIZAÇÃO ---------- */

  function init() {
    dbg("🚀 tagueamento v4 iniciado");
    loadGA();
    document.addEventListener("click", onGlobalClick, true);
    trackForms();

    const mo = new MutationObserver(trackForms);
    mo.observe(document.body, { childList: true, subtree: true });

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
