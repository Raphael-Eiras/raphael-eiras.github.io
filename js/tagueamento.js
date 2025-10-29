/* ============================================================
   tagueamento-v4.3.js
   DP6 Case Técnico - Raphael Eiras
   Rastreamento completo de page_view, cliques e formulários
   com bloqueio pós-carregamento da propriedade G-BZXLFW2C48
   ============================================================ */

(function () {
  const GA4_ID = "G-096NHNN8Q2";
  const BLOCKED_IDS = ["G-BZXLFW2C48"];
  const dbg = (...a) => window.__DEBUG_GTAG && console.log("[TAGUEAMENTO]", ...a);

  /* ---------- 1) Carrega GA4 primeiro (safe loader) ---------- */
  (function safeInit(){
    const s=document.createElement("script");
    s.async=true;
    s.src=`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", GA4_ID, { send_page_view:false });

    dbg("✅ GA4 carregando:", GA4_ID);

    // Ativa bloqueio após 2s (evita travar a lib principal)
    setTimeout(()=>{
      const orig=document.createElement;
      document.createElement=function(tag,opts){
        const el=orig.call(document,tag,opts);
        if(tag.toLowerCase()==="script"){
          const set=el.setAttribute;
          el.setAttribute=function(name,value){
            if(name==="src" && typeof value==="string" && BLOCKED_IDS.some(id=>value.includes(id))){
              console.warn("🚫 Bloqueado script GA:",value);
              return set.call(this,name,"");
            }
            return set.call(this,name,value);
          };
        }
        return el;
      };
      // Remove scripts já existentes com ID bloqueado
      document.querySelectorAll('script[src*="G-BZXLFW2C48"]').forEach(s=>{
        console.warn("🚫 Removendo script indevido:", s.src);
        s.remove();
      });
    },2000);
  })();

  /* ---------- 2) Funções auxiliares ---------- */

  function sendEvent(name, params={}) {
    const payload = { page_location: location.href, ...params };
    gtag("event", name, payload);
    dbg("🎯", name, payload);
  }

  function sendPageView(extra={}) {
    sendEvent("page_view", extra);
  }

  function getElInfo(el) {
    const tag = el.tagName?.toLowerCase() || "";
    const id = el.id || "";
    const classes = el.className ? String(el.className).trim() : "";
    const href = el.getAttribute?.("href") || "";
    const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g," ");
    return { element_tag:tag, element_id:id, element_classes:classes, element_href:href, element_text:text };
  }

  /* ---------- 3) Clique global ---------- */
  function onClick(ev){
    const el = ev.target.closest("a, button, .card, .menu-lista-link, .next-page");
    if(!el) return;
    const info = getElInfo(el);
    let eventName="click", group="geral", name=info.element_text.toLowerCase();

    if(info.element_classes.includes("menu-lista")){
      group="menu";
      name = info.element_classes.match(/menu-lista-(\w+)/)?.[1] || name;
    }

    if(document.body.classList.contains("analise") && el.classList.contains("card")){
      group="ver_mais";
      name = el.dataset.name?.toLowerCase() || el.querySelector(".card-title")?.innerText.toLowerCase() || "conteudo";
    }

    if(el.classList.contains("next-page")){
      group="navegacao";
      name="next_page";
    }

    if(info.element_href.startsWith("#")){
      eventName="anchor_click";
      name=info.element_href.replace("#","");
    }

    sendEvent(eventName,{element_group:group, element_name:name, ...info});
  }

  /* ---------- 4) Formulários ---------- */
  function trackForms(){
    document.querySelectorAll("form").forEach(form=>{
      if(form.__tracked) return;
      form.__tracked=true;
      const meta={
        form_id:form.id||"",
        form_name:form.getAttribute("name")||"form",
        form_destination:form.getAttribute("action")||location.href
      };
      let started=false;
      form.querySelectorAll("input,textarea,select").forEach(i=>{
        i.addEventListener("focus",()=>{
          if(!started){ started=true; sendEvent("form_start",meta); }
        },{passive:true});
      });
      form.addEventListener("submit",()=>{
        const btn=form.querySelector('[type="submit"]');
        const txt=btn?(btn.value||btn.innerText||"").trim().toLowerCase():"enviar";
        sendEvent("form_submit",{...meta,form_submit_text:txt});
        setTimeout(()=>sendEvent("view_form_success",meta),800);
      });
    });
  }

  /* ---------- 5) Inicialização ---------- */
  function init(){
    dbg("🚀 tagueamento v4.3 iniciado");
    document.addEventListener("click", onClick, true);
    trackForms();
    const obs=new MutationObserver(trackForms);
    obs.observe(document.body,{childList:true,subtree:true});
    sendPageView();
    window.addEventListener("hashchange",()=>sendPageView({reason:"hashchange"}));
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();
