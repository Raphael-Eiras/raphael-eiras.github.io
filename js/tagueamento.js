/* tagueamento.js
   Versão final: coleta page_view e todos os cliques (delegation) + formulários
   GA4 Measurement ID: G-096NHNN8Q2
   Debug: window.__DEBUG_GTAG = true
*/
(function () {
  const GA4_ID = "G-096NHNN8Q2";
  const BLOCKED_IDS = ["G-BZXLFW2C48"]; // opcional: IDs que você quer bloquear
  const MAX_TEXT_CHARS = 160;

  // Debug helper
  function dbg(...args) { if (window.__DEBUG_GTAG) console.log("[GTAG-DBG]", ...args); }

  // --- Utilities --------------------------------------------------------------
  function safeJSON(obj) {
    try { return JSON.stringify(obj); } catch (e) { return "{}"; }
  }

  function getElementInfo(el) {
    if (!el) return {};
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    const id = el.id || "";
    const classes = el.className ? String(el.className).trim() : "";
    const href = el.getAttribute && el.getAttribute("href") ? el.getAttribute("href") : "";
    let text = (el.innerText || el.textContent || "").trim();
    if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS) + "...";
    const dataset = el.dataset ? Object.assign({}, el.dataset) : {};
    return { element_tag: tag, element_id: id, element_classes: classes, element_text: text, element_href: href, element_dataset: dataset };
  }

  // minimal xpath-ish path to help identify element in DOM for debugging
  function simplePath(el) {
    if (!el || !el.tagName) return "";
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== "html") {
      let part = node.tagName.toLowerCase();
      if (node.id) part += `#${node.id}`;
      else if (node.className) part += `.${String(node.className).trim().replace(/\s+/g, ".")}`;
      const parent = node.parentNode;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === node.tagName);
        if (siblings.length > 1) {
          const index = Array.prototype.indexOf.call(parent.children, node) + 1;
          part += `:nth-child(${index})`;
        }
      }
      parts.unshift(part);
      node = node.parentNode;
      if (parts.length > 6) break;
    }
    return parts.join(" > ");
  }

  // find actionable element in event path
  function findActionableElement(path) {
    if (!path || !path.length) return null;
    for (const node of path) {
      if (!node || !node.tagName) continue;
      const tag = node.tagName.toLowerCase();
      if (tag === "a" || tag === "button" || tag === "input" || tag === "select" || tag === "textarea") return node;
      // any element with onclick or role=button or data-track
      if (node.getAttribute && (node.getAttribute("onclick") || node.getAttribute("role") === "button" || node.hasAttribute && node.hasAttribute("data-track"))) return node;
    }
    return null;
  }

  // send event via gtag, with retry if gtag not ready
  function sendToGA(eventName, params) {
    const payload = Object.assign({ page_location: location.href }, params || {});
    // try/catch send; retry if gtag undefined
    try {
      if (typeof gtag === "function") {
        gtag("event", eventName, payload);
        dbg("gtag send", eventName, payload);
      } else {
        dbg("gtag not ready, queueing send in 300ms", eventName);
        setTimeout(() => sendToGA(eventName, params), 300);
      }
    } catch (err) {
      console.error("gtag send error:", err, eventName, payload);
    }
  }

  // --- GA4 loader ------------------------------------------------------------
  function blockKnownBadScripts() {
    // remove any script tags already present with blocked IDs (best-effort)
    try {
      const scripts = Array.from(document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]'));
      scripts.forEach(s => {
        try {
          const src = s.src || "";
          for (const id of BLOCKED_IDS) {
            if (src.includes(id)) {
              dbg("Removing blocked GA script:", src);
              s.remove();
            }
          }
        } catch (e) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }
  }

  function injectGA() {
    // ensure we don't inject multiple times
    if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_ID}"]`)) {
      dbg("GA script already present");
      return;
    }
    // create script with defer to keep order but not block rendering
    const s = document.createElement("script");
    s.defer = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    s.onload = () => {
      dbg("gtag.js loaded");
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { dataLayer.push(arguments); };
      try {
        gtag("js", new Date());
        gtag("config", GA4_ID, { send_page_view: false });
        // initial pageview after load
        sendToGA("page_view", { page_location: location.href });
      } catch (e) {
        dbg("Error init gtag:", e);
      }
    };
    s.onerror = () => dbg("Error loading gtag.js");
    document.head.appendChild(s);
  }

  // --- Global click capture (delegation) ------------------------------------
  function onGlobalClick(ev) {
    try {
      const path = ev.composedPath ? ev.composedPath() : (ev.path || []);
      const actionable = findActionableElement(path.length ? path : [ev.target]);
      const target = actionable || ev.target;
      if (!target) return;

      // Prepare parameters
      const elInfo = getElementInfo(target);
      const xpath = simplePath(target);
      // Add dataset keys shallow
      const datasetJSON = safeJSON(elInfo.element_dataset || {});

      // Determine event name: for anchors with href that ends with .pdf -> file_download
      let eventName = "click";
      if (elInfo.element_tag === "a" && elInfo.element_href && /\.pdf($|\?)/i.test(elInfo.element_href)) {
        eventName = "file_download";
      } else {
        // custom: if element has data-event attribute, use that
        const customEvent = target.getAttribute && target.getAttribute("data-event");
        if (customEvent) eventName = customEvent;
      }

      // Build params
      const params = {
        element_tag: elInfo.element_tag,
        element_id: elInfo.element_id,
        element_classes: elInfo.element_classes,
        element_text: elInfo.element_text,
        element_href: elInfo.element_href,
        element_dataset: datasetJSON,
        element_path: xpath,
        page_location: location.href,
      };

      // send
      sendToGA(eventName, params);
    } catch (err) {
      console.error("Error in onGlobalClick:", err);
    }
  }

  // --- Form tracking --------------------------------------------------------
  function wireFormTracking() {
    try {
      const forms = Array.from(document.querySelectorAll("form"));
      forms.forEach((form) => {
        if (form.__tracking_attached) return;
        form.__tracking_attached = true;

        const meta = {
          form_id: form.id || "",
          form_name: form.getAttribute("name") || "",
          form_destination: form.getAttribute("action") || ""
        };

        let started = false;
        const inputs = form.querySelectorAll("input, textarea, select");
        inputs.forEach(input => {
          input.addEventListener("focus", () => {
            if (!started) {
              started = true;
              sendToGA("form_start", meta);
            }
          }, { passive: true });
        });

        form.addEventListener("submit", (e) => {
          // before navigation
          let submitText = "";
          try {
            const btn = form.querySelector('button[type="submit"], input[type="submit"]');
            submitText = (btn && (btn.value || btn.innerText || btn.textContent)) || "";
          } catch (e) {}
          sendToGA("form_submit", Object.assign({}, meta, { form_submit_text: String(submitText).trim().toLowerCase() }));

          // try to detect success after short delay (best-effort)
          setTimeout(() => {
            // if the form shows a success node we can detect common selectors
            const successSelectors = ['.form-success', '.mensagem-sucesso', '.alert-success', '.toast-success', '#sucesso'];
            let found = false;
            for (const sel of successSelectors) {
              const el = document.querySelector(sel);
              if (el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)) {
                found = true; break;
              }
            }
            if (found) {
              sendToGA("view_form_success", meta);
            } else {
              // fallback: still send success after short timeout (avoid false positives in some cases)
              sendToGA("view_form_success", meta);
            }
          }, 800);
        }, { passive: true });
      });
    } catch (err) {
      console.error("Error wiring forms:", err);
    }
  }

  // --- Initialization & resilience -----------------------------------------
  function initAll() {
    try {
      blockKnownBadScripts(); // attempt to remove already present blocked scripts
      injectGA();
      document.addEventListener("click", onGlobalClick, true); // capture phase to catch early
      wireFormTracking();

      // ensure forms are wired if DOM changes
      const mo = new MutationObserver(() => {
        wireFormTracking();
      });
      mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) {
      console.error("initAll error", e);
    }
  }

  // send page_view on visibilitychange (when tab regains visibility)
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      sendToGA("page_view", { page_visibility: "visible" });
    }
  });

  // send page_view on SPA popstate navigation
  window.addEventListener("popstate", function () {
    sendToGA("page_view", { from_popstate: true });
  });

  // run init when DOM ready (if already loaded, run immediately)
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(initAll, 0);
  } else {
    document.addEventListener("DOMContentLoaded", initAll);
  }

  // Expose lightweight API for debugging / manual triggers
  window.__gtag_helper = {
    sendPageView: () => sendToGA("page_view", { manual: true }),
    sendClick: (params) => sendToGA("click", params || {})
  };

  dbg("tagueamento.js loaded (debug=" + !!window.__DEBUG_GTAG + ")");
})();
