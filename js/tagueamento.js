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
    const payload = Object.
