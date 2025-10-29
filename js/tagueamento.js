/* ============================================================
   tagueamento-v4.2.js
   Implementação unificada de pageview + click tracking
   para index.html, analise.html e sobre.html
   Propriedade: G-096NHNN8Q2
   ============================================================ */

(function () {
  const GA4_ID = "G-096NHNN8Q2";
  const BLOCKED_IDS = ["G-BZXLFW2C48"];
  const dbg = (...a) => window.__DEBUG_GTAG && console.log("[TAGUEAMENTO]", ...a);

  /* ---------- BLOQUEIO DE PROPRIEDADES INDESEJADAS ---------- */
  (function blockUnwanted() {
    const orig = document.createElement;
    document.createElement = function (tag, opts) {
      const el = orig.call(document, tag, opts);
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
    const origGtag = window.gtag;
    window.gtag = function (...args) {
      if (args && args[1] && BLOCKED_IDS.includes(args[1])) {
        dbg("🚫 gtag bloqueado:", args);
        return;
      }
      if (origGtag) return origGtag.apply(this, args);
      (window.dataLayer = window.dataLayer || []).push(args);
    };
  })();

  /* ---------- INICIALIZAÇÃO DO GA ---------- */
  function loadGA() {
    if (window.__GA_READY) return;
    window.__GA_READY = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    s.onload = () => {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { dataLayer.push(arguments); };
      gtag("js", new Date());
      gtag("config", GA4_ID, { send_page_view: false });
      sendPageView();
      dbg("✅ GA carregado:", GA4_ID);
    };
    document.head.appendChild(s);
  }

  /* ---------- PAGE VIEW ---------- */
  function sendPageView(extra = {}) {
    const data = { page_location: location.href, ...extra };
    gtag("event", "page_view", data);
    dbg("📄 page_view", data);
  }

  /* ---------- CLICK TRACKING ---------- */
  function getElInfo(el) {
    const tag = el.tagName?.toLowerCase() || "";
    const id = el.id || "";
    const classes = el.className ? String(el.className).trim() : "";
    const href = el.getAttribute?.("href") || "";
    const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    return { element_tag: tag, element_id: id, element_classes: classes, element_href: href, element_text: text };
  }

  function onClick(ev) {
    const el = ev.target.closest("a, button, .card, .menu-lista-link, .next-page");
    if (!el) return;
    const info = getElInfo(el);
    let eventName = "click";
    let group = "geral", name = info.element_text.toLowerCase();

    if (info.element_classes.includes("menu-lista")) {
      group = "menu";
      name = info.element_classes.match(/menu-lista-(\w+)/)?.[1] || name;
    }

    if (document.body.classList.contains("analise") && el.classList.contains("card")) {
      group = "ver_mais";
      name = el.dataset.name?.toLowerCase() || el.querySelector(".card-title")?.innerText.toLowerCase() || "conteudo";
    }

    if (el.classList.contains("next-page")) {
      group = "navegacao";
      name = "next_page";
    }

    if (info.element_href.startsWith("#")) {
      eventName = "anchor_click";
      name = info.element_href.replace("#", "");
    }

    gtag("event", eventName, {
      page_location: location.href,
      element_group: group,
      element_name: name,
      ...info
    });
    dbg("🎯", eventName, group, name, info);
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
      form.querySelectorAll("input, textarea").forEach(i => {
        i.addEventListener("focus", () => {
          if (!started) {
            started = true;
            gtag("event", "form_start", meta);
            dbg("📝 form_start", meta);
          }
        });
      });
      form.addEventListener("submit", e => {
        gtag("event", "form_submit", meta);
        dbg("📤 form_submit", meta);
        setTimeout(() => gtag("event", "view_form_success", meta), 800);
      });
    });
  }

  /* ---------- INICIALIZAÇÃO ---------- */
  function init() {
    dbg("🚀 tagueamento v4.2 iniciado");
    loadGA();
    document.addEventListener("click", onClick, true);
    trackForms();
    window.addEventListener("hashchange", () => sendPageView({ reason: "hashchange" }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
