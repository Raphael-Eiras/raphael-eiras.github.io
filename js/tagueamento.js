/* tagueamento.js — versão final (colocar no <head> antes de outros scripts) */
/* Objetivo: bloquear propriedades indesejadas, carregar GA4 G-096NHNN8Q2 de forma controlada,
   garantir page_view estável, e capturar todos os cliques + formulários. */

(function () {
  const GA4_ID = "G-096NHNN8Q2";
  const BLOCKED_IDS = ["G-BZXLFW2C48"]; // IDs que queremos impedir
  const MAX_TEXT = 160;

  // debug: ative no console com window.__DEBUG_GTAG = true
  function dbg() { if (window.__DEBUG_GTAG) console.log.apply(console, ["[GTAG]"].concat(Array.from(arguments))); }

  // 1) Intercepta e neutraliza tentativas de criar scripts GA4 com IDs bloqueados
  (function interceptCreateElement() {
    const origCreate = document.createElement;
    document.createElement = function (tagName, options) {
      const el = origCreate.call(document, tagName, options);
      if (tagName && String(tagName).toLowerCase() === "script") {
        const origSet = el.setAttribute;
        el.setAttribute = function (name, value) {
          if (name === "src" && typeof value === "string") {
            for (const id of BLOCKED_IDS) {
              if (value.includes(id)) {
                dbg("Blocking creation of script with src:", value);
                // neutraliza atribuição — torna src vazio
                return origSet.call(this, name, "");
              }
            }
          }
          return origSet.call(this, name, value);
        };
      }
      return el;
    };
    dbg("createElement interception active");
  })();

  // 2) Intercepta chamadas gtag('config', ...) para filtrar blocked IDs (caso gtag já exista)
  (function interceptExistingGtag() {
    const oldGtag = window.gtag;
    window.gtag = function () {
      try {
        const args = Array.from(arguments);
        if (args[0] === "config" && args[1] && BLOCKED_IDS.includes(String(args[1]))) {
          dbg("Blocked gtag config for: ", args[1]);
          return; // ignora config para blocked ids
        }
      } catch (e) { /* swallow */ }
      if (typeof oldGtag === "function") {
        return oldGtag.apply(window, arguments);
      } else {
        // fallback: queue into dataLayer
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(arguments);
      }
    };
    dbg("gtag interceptor installed");
  })();

  // 3) Carregamento controlado do gtag do GA4 alvo
  function loadGA4() {
    if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_ID}"]`)) {
      dbg("GA4 script already present for", GA4_ID);
      return initGtag();
    }
    const s = document.createElement("script");
    s.defer = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    s.onload = () => {
      dbg("GA4 script loaded");
      initGtag();
    };
    s.onerror = () => dbg("Failed to load GA4 script");
    document.head.appendChild(s);
  }

  // 4) Inicializa gtag e envia page_view quando pronto
  function initGtag(retry) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { dataLayer.push(arguments); };

    try {
      gtag("js", new Date());
      gtag("config", GA4_ID, { send_page_view: false });
      // garantir envio quando página realmente visível
      sendPageView();
    } catch (e) {
      if (!retry) {
        setTimeout(() => initGtag(true), 300);
      } else {
        dbg("initGtag retry failed:", e);
      }
    }
  }

  function sendPageView() {
    try {
      gtag("event", "page_view", { page_location: location.href });
      dbg("page_view sent", location.href);
    } catch (e) {
      // se gtag não estiver pronto, tenta de novo
      setTimeout(sendPageView, 300);
    }
  }

  // Helper para extrair info do elemento
  function elementInfo(el) {
    if (!el || !el.tagName) return {};
    const tag = String(el.tagName || "").toLowerCase();
    const id = el.id || "";
    const classes = (el.className && typeof el.className === "string") ? el.className : "";
    let text = (el.innerText || el.textContent || "").trim();
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT) + "...";
    const href = el.getAttribute && el.getAttribute("href") ? el.getAttribute("href") : "";
    const dataset = el.dataset ? Object.assign({}, el.dataset) : {};
    return { element_tag: tag, element_id: id, element_classes: classes, element_text: text, element_href: href, element_dataset: dataset };
  }

  // Envio resiliente de eventos
  function sendEvent(name, params) {
    params = params || {};
    params.page_location = location.href;
    try {
      if (typeof gtag === "function") {
        gtag("event", name, params);
        dbg("event sent:", name, params);
      } else {
        // se gtag não definido ainda, tenta novamente
        dbg("gtag not ready, retry sending event:", name);
        setTimeout(() => sendEvent(name, params), 300);
      }
    } catch (e) {
      dbg("error sending event", e);
    }
  }

  // Delegation global para capturar cliques (captura fase de bolha)
  function onClickDelegate(ev) {
    try {
      const path = ev.composedPath ? ev.composedPath() : (ev.path || []);
      const el = (Array.isArray(path) && path.length) ? path.find(n => n.tagName) : ev.target;
      if (!el) return;
      const info = elementInfo(el);
      // determina tipo de evento
      let eventName = "click";
      if (info.element_tag === "a" && /\.pdf(\?|$)/i.test(info.element_href || "")) {
        eventName = "file_download";
      }
      // eventos específicos do case (menu entre em contato / download)
      if (info.element_classes && info.element_classes.includes("menu-lista-contato")) {
        eventName = "click";
        info.element_group = "menu";
        info.element_name = "entre_em_contato";
      } else if (info.element_classes && info.element_classes.includes("menu-lista-download")) {
        eventName = "file_download";
        info.element_group = "menu";
        info.element_name = "download_pdf";
      } else {
        // se houver data-event use como nome
        const de = el.getAttribute && el.getAttribute("data-event");
        if (de) eventName = de;
      }
      // add fallback names for ver_mais in análise: check parent classes/text
      if (document.body && document.body.classList && document.body.classList.contains("analise")) {
        // heurística: se o element or its ancestor is a card or has 'ver' text
        let ancestor = el;
        let foundCard = false;
        for (let i=0;i<6 && ancestor; i++) {
          if (ancestor.classList && (ancestor.classList.contains("card") || ancestor.classList.contains("card-item") || ancestor.classList.contains("card-link") || ancestor.className && ancestor.className.includes("card"))) {
            foundCard = true; break;
          }
          ancestor = ancestor.parentElement;
        }
        if (foundCard) {
          eventName = "click";
          info.element_group = "ver_mais";
          info.element_name = info.element_text || (el.getAttribute && el.getAttribute("aria-label")) || "conteudo";
          if (typeof info.element_name === "string") info.element_name = info.element_name.trim().toLowerCase().slice(0,80);
        }
      }
      sendEvent(eventName, info);
      // If it's a download link that navigates away, delay navigation slightly to allow hit to send
      if (info.element_tag === "a" && info.element_href && info.element_href.match(/\.(pdf|zip|xls|xlsx|doc|docx)(\?|$)/i)) {
        // prevent default and navigate after 350ms
        ev.preventDefault();
        const href = info.element_href;
        setTimeout(() => { window.location.href = href; }, 350);
      }
    } catch (e) {
      dbg("onClickDelegate error", e);
    }
  }

  // Form tracking
  function wireForms() {
    try {
      const forms = document.querySelectorAll("form");
      forms.forEach(form => {
        if (form.__tag_attached) return;
        form.__tag_attached = true;
        const meta = { form_id: form.id || "", form_name: form.getAttribute("name") || "", form_destination: form.getAttribute("action") || "" };
        let started = false;
        const controls = form.querySelectorAll("input,textarea,select");
        controls.forEach(ctrl => ctrl.addEventListener("focus", () => {
          if (!started) { started = true; sendEvent("form_start", meta); }
        }, { passive:true }));
        form.addEventListener("submit", (ev) => {
          let submitText = "";
          try { const btn = form.querySelector('button[type="submit"], input[type="submit"]'); submitText = (btn && (btn.value || btn.innerText || "")) || ""; } catch(e){}
          sendEvent("form_submit", Object.assign({}, meta, { form_submit_text: String(submitText).trim().toLowerCase() }));
          // best-effort success detection after short delay
          setTimeout(() => {
            const successSel = ['.form-success','.mensagem-sucesso','.alert-success','#sucesso','.popup-success'];
            let ok=false;
            for (const s of successSel) { const el = document.querySelector(s); if (el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)) { ok=true; break; } }
            if (ok) sendEvent("view_form_success", meta);
            else sendEvent("view_form_success", meta); // fallback still send
          }, 800);
        }, { passive:true });
      });
    } catch (e) { dbg("wireForms error", e); }
  }

  // Init
  function init() {
    dbg("init tagueamento");
    // remove existing scripts with blocked ids if any (best-effort)
    try {
      Array.from(document.querySelectorAll('script[src]')).forEach(s => {
        const src = s.src || "";
        for (const id of BLOCKED_IDS) if (src.includes(id)) { dbg("removing blocked script src", src); s.remove(); }
      });
    } catch (e) { /* ignore */ }

    loadGA4();
    document.addEventListener("click", onClickDelegate, true); // capture phase
    wireForms();
    // watch for dynamic content adding forms/buttons
    const mo = new MutationObserver(() => { wireForms(); });
    mo.observe(document.documentElement || document.body, { childList:true, subtree:true });
    // re-send page_view on visibility regain
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sendPageView(); });
    // also on popstate (history)
    window.addEventListener("popstate", sendPageView);
  }

  // run as soon as possible
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
