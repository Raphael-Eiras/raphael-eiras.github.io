# Implementação de Tagueamento – DP6 Case com GA4 (gtag.js)

Este documento apresenta a solução implementada para o **case prático** de instrumentação com **Google Analytics 4 (GA4)** utilizando **gtag.js**.  
O objetivo foi entregar uma implementação limpa, padronizada e totalmente aderente às especificações do enunciado.

---

## Objetivo do Projeto

Garantir o envio de:

- **Visualizações de Página**
- **Eventos de Interação** 
- **Fluxo de Formulário** 

---

## Estrutura da Implementação

## Principais Funcionalidades

| Página / Elemento        | Evento GA4          | Parâmetros Enviados                         |
|------------------------|------------------|---------------------------------------------|
| Todas                  | `page_view`      | — *(sem parâmetros)* |
| Menu – Entre em Contato | `click`          | `page_location`, `element_group=menu`, `element_name=entre_em_contato` |
| Menu – Download PDF     | `file_download`  | `page_location`, `element_group=menu`, `element_name=download_pdf` |
| Análise – Ver Mais      | `click`          | `page_location`, `element_group=ver_mais`, `element_name=lorem|ipsum|dolor` |
| Sobre – Form Start      | `form_start`     | `page_location`, `form_id`, `form_name`, `form_destination` |
| Sobre – Form Submit     | `form_submit`    | `page_location`, `form_id`, `form_name`, `form_destination`, `form_submit_text` |
| Sobre – Sucesso         | `view_form_success` | `page_location`, `form_id`, `form_name` |


## Validação e Garantia de Qualidade

- **Network (DevTools):** filtro `collect?v=2` para confirmar 1 hit por evento.
- **DebugView (GA4):** validação da ordem de eventos, principalmente no fluxo de formulário.
- **Flags de Controle:** previnem eventos duplicados e garantem sequência correta.
- **Tratativa de Navegação:** opção de abrir downloads em nova aba ou atrasar navegação para garantir envio do hit antes de mudar de página.

---

## Boas Práticas Aplicadas

- **Controle Manual de `page_view`
- **Uso de `addEventListener`** 
- **DataLayer para QA:**
---



