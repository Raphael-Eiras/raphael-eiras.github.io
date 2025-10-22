  
(function () {
  const GA4_ID = 'G-096NHNN8Q2';

  // 0) Base gtag + carga do script
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ dataLayer.push(arguments); };

  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_ID}"]`)) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s);
  }

  gtag('js', new Date());
  gtag('config', GA4_ID, { send_page_view: false }); // vamos enviar manualmente

  // Helper simples: envia evento com page_location + params informados
  // Espelho no dataLayer é opcional: ative no console com window.__DL_MIRROR = true
  window.__DL_MIRROR = window.__DL_MIRROR || false;
  function track(name, params) {
    const payload = Object.assign({ page_location: location.href }, params || {});
    if (window.__DL_MIRROR) { try { dataLayer.push(Object.assign({ event: name }, payload)); } catch(e){} }
    gtag('event', name, payload);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.__GA4_BOUND) return;   // evita listeners duplicados
    window.__GA4_BOUND = true;

    // 1) page_view padrão (SEM parâmetros)
    gtag('event', 'page_view');

    // 2) MENU (classes do HTML do case)
    const contato  = document.querySelector('.menu-lista-contato');
    const download = document.querySelector('.menu-lista-download');

    if (contato)  contato.addEventListener('click', () => {
      track('click', { element_group: 'menu', element_name: 'entre_em_contato' });
    });

    if (download) download.addEventListener('click', () => {
      track('file_download', { element_group: 'menu', element_name: 'download_pdf' });
    });

    // 3) ANÁLISE – "Ver Mais" (simples mapeamento por posição)
    if (document.body.classList.contains('analise')) {
      const labels = ['lorem', 'ipsum', 'dolor']; // exatamente como o case pede
      document.querySelectorAll('.card-link').forEach((btn, i) => {
        btn.addEventListener('click', () => {
          track('click', { element_group: 'ver_mais', element_name: labels[i] || 'conteudo' });
        });
      });
    }

    // 4) SOBRE – Formulário (ordem garantida: start -> submit -> success)
    if (document.body.classList.contains('sobre')) {
      const form = document.querySelector('form.contato') || document.querySelector('form');
      if (!form) return;

      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      const meta = {
        form_id: form.id || '',
        form_name: form.getAttribute('name') || 'contato',
        form_destination: form.getAttribute('action') || (location.origin + location.pathname + '#contato')
      };

      let started = false, submitted = false, successSent = false;

      // 4.1) form_start — 1ª interação em QUALQUER campo
      function onStart(){
        if (started) return;
        started = true;
        track('form_start', {
          form_id: meta.form_id, form_name: meta.form_name, form_destination: meta.form_destination
        });
      }
      form.querySelectorAll('input, textarea, select').forEach(el => {
        ['focus','input','change'].forEach(ev => el.addEventListener(ev, onStart, { passive:true }));
      });

      // 4.2) form_submit — clique no enviar
      form.addEventListener('submit', () => {
        submitted = true;
        const txt = (submitBtn && (submitBtn.value || submitBtn.innerText || submitBtn.textContent)) || 'enviar';
        track('form_submit', {
          form_id: meta.form_id, form_name: meta.form_name, form_destination: meta.form_destination,
          form_submit_text: String(txt).trim().toLowerCase()
        });
        maybeSendSuccess(); // se o popup já estiver visível
      });

      // 4.3) view_form_success — quando aparecer o popup/mensagem de sucesso
      const successSelectors = [
        '.lightbox', '.form-success', '.mensagem-sucesso', '.alert-success', '.toast-success', '#sucesso', '.popup-success'
      ];
      function isVisible(el){ return !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
      function successVisible(){
        for (const sel of successSelectors) { const el = document.querySelector(sel); if (isVisible(el)) return true; }
        return false;
      }
      function maybeSendSuccess(){
        if (!submitted || successSent) return;   // só depois do submit e 1x
        if (successVisible()){
          successSent = true;
          track('view_form_success', { form_id: meta.form_id, form_name: meta.form_name });
          try { obs.disconnect(); } catch(e){}
        }
      }
      const obs = new MutationObserver(maybeSendSuccess);
      obs.observe(document.body, { childList:true, subtree:true, attributes:true,
                                   attributeFilter:['style','class','hidden','aria-hidden'] });
    }
  });
})();