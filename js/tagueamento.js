/* tagueamento.js - GTAG version for case-dp6 (Measurement ID: G-096NHNN8Q2) */
(function(){
  const GA4_ID = 'G-096NHNN8Q2';

  // Load gtag if not present
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ dataLayer.push(arguments); };

  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_ID}"]`)) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s);
  }

  gtag('js', new Date());
  gtag('config', GA4_ID, { send_page_view: false }); // manual page_view

  function track(name, params) {
    const payload = Object.assign({ page_location: location.href }, params || {});
    try { gtag('event', name, payload); } catch(e) { console.error('gtag send error', e); }
  }

  document.addEventListener('DOMContentLoaded', function(){
    if (window.__GA4_BOUND) return;
    window.__GA4_BOUND = true;

    // send page_view
    gtag('event', 'page_view');

    // menu
    const contato = document.querySelector('.menu-lista-contato');
    const download = document.querySelector('.menu-lista-download');
    if (contato) contato.addEventListener('click', function(){ track('click', { element_group: 'menu', element_name: 'entre_em_contato' }); });
    if (download) download.addEventListener('click', function(){ track('file_download', { element_group: 'menu', element_name: 'download_pdf' }); });

    // analise - ver mais
    if (document.body.classList.contains('analise')) {
      const labels = ['lorem','ipsum','dolor'];
      document.querySelectorAll('.card-link').forEach(function(btn,i){
        btn.addEventListener('click', function(){
          track('click', { element_group: 'ver_mais', element_name: labels[i] || 'conteudo' });
        });
      });
    }

    // sobre - form
    if (document.body.classList.contains('sobre')) {
      const form = document.querySelector('form.contato') || document.querySelector('form');
      if (form) {
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        const meta = {
          form_id: form.id || '',
          form_name: form.getAttribute('name') || 'contato',
          form_destination: form.getAttribute('action') || (location.origin + location.pathname + '#contato')
        };
        let started=false, submitted=false, successSent=false;
        function onStart(){ if(started) return; started=true; track('form_start', meta); }
        form.querySelectorAll('input,textarea,select').forEach(function(el){ ['focus','input','change'].forEach(function(ev){ el.addEventListener(ev, onStart, { passive:true }); }); });
        form.addEventListener('submit', function(){ 
          submitted=true; 
          const txt = (submitBtn && (submitBtn.value || submitBtn.innerText || submitBtn.textContent)) || 'enviar'; 
          track('form_submit', Object.assign({}, meta, { form_submit_text: String(txt).trim().toLowerCase() })); 
          setTimeout(function(){ if(!successSent){ successSent=true; track('view_form_success', meta); } }, 800); 
        });
      }
    }

  });
})();
