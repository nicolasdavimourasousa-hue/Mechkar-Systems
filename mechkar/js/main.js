/* MechKar Systems — comportamento geral do site (tema claro/escuro, menu, animações, formulário).
   Expõe window.MechKar para o painel de acessibilidade usar. */
(function () {
  'use strict';

  const html = document.documentElement;
  const CHAVE_TEMA = 'mechkar-tema';
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento: tudo bem */ } };
  const ler = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  /* ---------- avisos para leitores de tela ---------- */
  const regiaoAvisos = document.getElementById('avisos');
  function anunciar(texto) {
    if (!regiaoAvisos) return;
    regiaoAvisos.textContent = '';
    // pequeno atraso para o leitor de tela perceber a mudança
    window.setTimeout(() => { regiaoAvisos.textContent = texto; }, 60);
  }

  /* ---------- tema claro / escuro ---------- */
  const consultaEscuro = window.matchMedia('(prefers-color-scheme: dark)');
  const botaoTema = document.getElementById('alternar-tema');
  const metaCor = document.querySelector('meta[name="theme-color"]');

  const preferencia = () => ler(CHAVE_TEMA) || 'auto';           // 'auto' | 'claro' | 'escuro'
  const resolver = (p) => (p === 'auto' ? (consultaEscuro.matches ? 'escuro' : 'claro') : p);

  function aplicarTema() {
    const pref = preferencia();
    const atual = resolver(pref);
    html.setAttribute('data-theme', atual);
    if (metaCor) metaCor.setAttribute('content', atual === 'escuro' ? '#0a1220' : '#f4f6fa');
    if (botaoTema) {
      botaoTema.setAttribute('aria-pressed', String(atual === 'escuro'));
      botaoTema.setAttribute('aria-label', atual === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro');
    }
    document.querySelectorAll('input[name="tema"]').forEach((r) => { r.checked = r.value === pref; });
  }

  function definirTema(pref, avisar = true) {
    guardar(CHAVE_TEMA, pref);
    aplicarTema();
    if (avisar) anunciar(pref === 'auto' ? 'Tema automático, igual ao do seu aparelho.' : `Modo ${pref} ativado.`);
  }

  if (botaoTema) {
    botaoTema.addEventListener('click', () => definirTema(resolver(preferencia()) === 'escuro' ? 'claro' : 'escuro'));
  }
  // se o aparelho trocar de tema e a página estiver em "automático", acompanha
  const aoMudarSistema = () => { if (preferencia() === 'auto') aplicarTema(); };
  if (consultaEscuro.addEventListener) consultaEscuro.addEventListener('change', aoMudarSistema);
  else if (consultaEscuro.addListener) consultaEscuro.addListener(aoMudarSistema);
  aplicarTema();

  /* ---------- menu no celular ---------- */
  const menu = document.getElementById('menu');
  const botaoMenu = document.getElementById('menu-btn');
  function fecharMenu(devolverFoco) {
    if (!menu || !menu.classList.contains('aberto')) return;
    menu.classList.remove('aberto');
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.setAttribute('aria-label', 'Abrir menu');
    if (devolverFoco) botaoMenu.focus();
  }
  if (botaoMenu && menu) {
    botaoMenu.addEventListener('click', () => {
      const abrir = !menu.classList.contains('aberto');
      menu.classList.toggle('aberto', abrir);
      botaoMenu.setAttribute('aria-expanded', String(abrir));
      botaoMenu.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) fecharMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenu(true); });
  }

  /* ---------- ir para uma seção (também usado pelos comandos de voz) ---------- */
  const reduzMovimento = () =>
    html.getAttribute('data-movimento') === 'reduzido' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function irPara(id) {
    const alvo = document.getElementById(id);
    if (!alvo) return false;
    alvo.scrollIntoView({ behavior: reduzMovimento() ? 'auto' : 'smooth', block: 'start' });
    // leva o foco para o título da seção, para teclado e leitor de tela continuarem de onde chegou
    const titulo = alvo.querySelector('h1, h2, h3') || alvo;
    if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1');
    titulo.focus({ preventScroll: true });
    return true;
  }

  /* ---------- link ativo no menu ---------- */
  const links = Array.from(document.querySelectorAll('.menu a[href^="#"]'));
  const secoes = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && secoes.length) {
    const visiveis = new Map();
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => visiveis.set(en.target.id, en.isIntersecting ? en.intersectionRatio : 0));
      let melhor = null; let max = 0;
      visiveis.forEach((r, id) => { if (r > max) { max = r; melhor = id; } });
      links.forEach((a) => {
        if (melhor && a.getAttribute('href') === `#${melhor}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-35% 0px -45% 0px', threshold: [0, .15, .4, .7, 1] });
    secoes.forEach((s) => obs.observe(s));
  }

  /* ---------- animações de entrada ---------- */
  const reveladas = document.querySelectorAll('.revelar');
  if ('IntersectionObserver' in window && !reduzMovimento()) {
    const obsRev = new IntersectionObserver((entradas, o) => {
      entradas.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('visivel'); o.unobserve(en.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    reveladas.forEach((el) => obsRev.observe(el));
  } else {
    reveladas.forEach((el) => el.classList.add('visivel'));
  }

  /* ---------- formulário de contato ---------- */
  const form = document.getElementById('form-contato');
  if (form) {
    const status = document.getElementById('form-status');
    const regras = {
      nome: (v) => (v.trim().length < 2 ? 'Informe seu nome.' : ''),
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Informe um e-mail válido, como nome@exemplo.com.'),
      assunto: (v) => (v ? '' : 'Escolha um assunto.'),
      mensagem: (v) => (v.trim().length < 10 ? 'Escreva uma mensagem com pelo menos 10 caracteres.' : ''),
    };
    const validar = (campo) => {
      const msg = regras[campo.name](campo.value);
      const erro = document.getElementById(`erro-${campo.name}`);
      campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (erro) erro.textContent = msg;
      return !msg;
    };
    const campos = Array.from(form.elements).filter((el) => regras[el.name]);
    campos.forEach((c) => {
      c.addEventListener('blur', () => validar(c));
      c.addEventListener('input', () => { if (c.getAttribute('aria-invalid') === 'true') validar(c); });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      status.textContent = '';
      const invalidos = campos.filter((c) => !validar(c));
      if (invalidos.length) {
        invalidos[0].focus();
        anunciar(`Há ${invalidos.length} ${invalidos.length === 1 ? 'campo' : 'campos'} para corrigir.`);
        return;
      }
      /* Aqui entra o envio de verdade (e-mail, API ou serviço de formulários).
         Por enquanto a página só confirma na tela, sem enviar os dados para lugar nenhum. */
      status.textContent = 'Mensagem pronta! (Demonstração: o envio ainda não está ligado a um servidor.)';
      anunciar(status.textContent);
      form.reset();
      campos.forEach((c) => c.setAttribute('aria-invalid', 'false'));
    });
  }

  const ano = document.getElementById('ano');
  if (ano) ano.textContent = String(new Date().getFullYear());

  window.MechKar = { anunciar, irPara, definirTema, tema: () => resolver(preferencia()), reduzMovimento };
})();
