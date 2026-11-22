/* MechKar Systems — painel de acessibilidade.
   Usa APIs do navegador: Web Speech (SpeechSynthesis para ler em voz alta e SpeechRecognition para comandos de voz),
   matchMedia (preferências do sistema), localStorage (lembrar escolhas) e ARIA (switches, diálogo, avisos).
   O VLibras (tradutor de Libras do governo) é carregado direto no index.html. */
(function () {
  'use strict';

  const html = document.documentElement;
  const M = window.MechKar || { anunciar() {}, irPara() {}, definirTema() {}, tema: () => 'claro' };
  const CHAVE = 'mechkar-acess';
  const $ = (id) => document.getElementById(id);

  const PADRAO = { fonte: 100, contraste: false, links: false, movimento: false, dislexia: false, espaco: false, cursor: false, velocidade: 1 };
  let cfg = { ...PADRAO };
  try { cfg = { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; } catch (e) { /* usa o padrão */ }
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(cfg)); } catch (e) { /* ok */ } };

  /* ---------- aplicar as opções na página ---------- */
  const ATRIBUTOS = {
    contraste: ['data-contraste', 'alto'],
    links: ['data-links', 'destacados'],
    movimento: ['data-movimento', 'reduzido'],
    dislexia: ['data-fonte', 'legivel'],
    espaco: ['data-espaco', 'amplo'],
    cursor: ['data-cursor', 'grande'],
  };
  const NOMES = {
    contraste: 'Alto contraste', links: 'Links destacados', movimento: 'Movimento reduzido',
    dislexia: 'Fonte de fácil leitura', espaco: 'Espaçamento maior', cursor: 'Cursor grande',
  };

  function aplicar() {
    html.style.setProperty('--escala-fonte', String(cfg.fonte / 100));
    $('fonte-valor').textContent = `${cfg.fonte}%`;
    $('fonte-menos').disabled = cfg.fonte <= 80;
    $('fonte-mais').disabled = cfg.fonte >= 170;
    Object.keys(ATRIBUTOS).forEach((k) => {
      const [attr, valor] = ATRIBUTOS[k];
      if (cfg[k]) html.setAttribute(attr, valor); else html.removeAttribute(attr);
    });
    document.querySelectorAll('.chave').forEach((b) => b.setAttribute('aria-checked', String(!!cfg[b.dataset.opcao])));
    $('voz-velocidade').value = String(cfg.velocidade);
    $('voz-velocidade-valor').textContent = `${cfg.velocidade.toFixed(1).replace('.', ',')}x`;
  }

  function mudarFonte(delta) {
    const nova = delta === 0 ? 100 : Math.min(170, Math.max(80, cfg.fonte + delta));
    if (nova === cfg.fonte && delta !== 0) return;
    cfg.fonte = nova;
    salvar(); aplicar();
    M.anunciar(`Tamanho do texto: ${nova}%`);
  }
  $('fonte-menos').addEventListener('click', () => mudarFonte(-10));
  $('fonte-mais').addEventListener('click', () => mudarFonte(10));
  $('fonte-reset').addEventListener('click', () => mudarFonte(0));

  function alternar(opcao, valor) {
    cfg[opcao] = typeof valor === 'boolean' ? valor : !cfg[opcao];
    salvar(); aplicar();
    M.anunciar(`${NOMES[opcao]} ${cfg[opcao] ? 'ativado' : 'desativado'}.`);
  }
  document.querySelectorAll('.chave').forEach((b) => b.addEventListener('click', () => alternar(b.dataset.opcao)));
  document.querySelectorAll('input[name="tema"]').forEach((r) => r.addEventListener('change', () => { if (r.checked) M.definirTema(r.value); }));

  /* ---------- abrir e fechar o painel ---------- */
  const painel = $('painel-acess');
  const abrirBtn = $('abrir-acess');
  function abrirPainel() {
    painel.hidden = false;
    abrirBtn.setAttribute('aria-expanded', 'true');
    $('fechar-acess').focus();
  }
  function fecharPainel(devolverFoco = true) {
    if (painel.hidden) return;
    painel.hidden = true;
    abrirBtn.setAttribute('aria-expanded', 'false');
    if (devolverFoco) abrirBtn.focus();
  }
  abrirBtn.addEventListener('click', () => (painel.hidden ? abrirPainel() : fecharPainel()));
  $('fechar-acess').addEventListener('click', () => fecharPainel());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !painel.hidden) fecharPainel();
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'a') { e.preventDefault(); painel.hidden ? abrirPainel() : fecharPainel(); }
  });

  /* ---------- leitura em voz alta (Web Speech: SpeechSynthesis) ---------- */
  const sintese = 'speechSynthesis' in window ? window.speechSynthesis : null;
  const dicaLeitura = $('dica-leitura');
  let lendo = false;
  let ultimaSelecao = '';

  document.addEventListener('selectionchange', () => {
    const t = String(window.getSelection()).trim();
    if (t) ultimaSelecao = t;
  });

  function escolherVoz() {
    const vozes = sintese.getVoices();
    return vozes.find((v) => v.lang === 'pt-BR') || vozes.find((v) => v.lang && v.lang.toLowerCase().startsWith('pt')) || null;
  }
  // divide o texto em pedaços curtos (alguns navegadores cortam falas muito longas)
  function dividir(texto) {
    const frases = texto.replace(/\s+/g, ' ').match(/[^.!?;:]+[.!?;:]*\s*/g) || [texto];
    const partes = [];
    let atual = '';
    frases.forEach((f) => {
      if ((atual + f).length > 170 && atual) { partes.push(atual.trim()); atual = f; } else atual += f;
    });
    if (atual.trim()) partes.push(atual.trim());
    return partes;
  }
  function pararLeitura(avisar = true) {
    if (!sintese) return;
    const estavaLendo = lendo;
    lendo = false;
    sintese.cancel();
    if (avisar && estavaLendo) M.anunciar('Leitura interrompida.');
    retomarVoz();
  }
  function falar(texto) {
    if (!sintese) return;
    pararLeitura(false);
    const partes = dividir(texto);
    if (!partes.length) return;
    lendo = true;
    pausarVoz();
    const voz = escolherVoz();
    partes.forEach((parte, i) => {
      const u = new SpeechSynthesisUtterance(parte);
      u.lang = 'pt-BR';
      if (voz) u.voice = voz;
      u.rate = cfg.velocidade;
      if (i === partes.length - 1) u.onend = () => { lendo = false; retomarVoz(); };
      u.onerror = () => { if (lendo) { lendo = false; retomarVoz(); } };
      sintese.speak(u);
    });
  }

  if (!sintese) {
    ['ler-pagina', 'ler-selecao', 'ler-parar'].forEach((id) => { $(id).disabled = true; });
    $('voz-velocidade').disabled = true;
    dicaLeitura.textContent = 'Seu navegador não tem leitura em voz alta. Tente o Chrome, Edge ou Safari.';
  } else {
    sintese.getVoices(); // algumas vozes só carregam depois
    $('ler-pagina').addEventListener('click', () => {
      const alvo = $('conteudo');
      falar(`MechKar Systems. ${alvo.innerText}`);
      M.anunciar('Lendo a página em voz alta.');
    });
    $('ler-selecao').addEventListener('click', () => {
      const t = String(window.getSelection()).trim() || ultimaSelecao;
      if (!t) { dicaLeitura.textContent = 'Selecione um trecho do texto da página e toque em "Ler seleção".'; M.anunciar('Selecione um trecho para ler.'); return; }
      dicaLeitura.textContent = 'A leitura usa a voz do seu aparelho.';
      falar(t);
    });
    $('ler-parar').addEventListener('click', () => pararLeitura());
    window.addEventListener('beforeunload', () => sintese.cancel());
  }
  $('voz-velocidade').addEventListener('input', (e) => {
    cfg.velocidade = Number(e.target.value);
    salvar(); aplicar();
  });

  /* ---------- comandos de voz (Web Speech: SpeechRecognition) ---------- */
  const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
  const botaoVoz = $('voz-comando');
  const dicaVoz = $('dica-voz');
  const DICA_VOZ = 'Diga, por exemplo: "ir para equipe", "modo escuro", "aumentar fonte" ou "ler página".';
  let rec = null;
  let ouvindo = false;
  let pausado = false;

  const limpar = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  const COMANDOS = [
    [/\b(parar|pare|silencio|chega)\b/, () => { pararLeitura(); return 'Leitura interrompida'; }],
    [/\bler\b|\bleia\b|\blendo\b/, () => { $('ler-pagina').click(); return 'Lendo a página'; }],
    [/(modo|tema)? ?escuro|escurecer/, () => { M.definirTema('escuro'); return 'Modo escuro'; }],
    [/(modo|tema)? ?claro|clarear/, () => { M.definirTema('claro'); return 'Modo claro'; }],
    [/(aumentar|maior|crescer).*(fonte|letra|texto)|(fonte|letra|texto) maior/, () => { mudarFonte(10); return 'Texto maior'; }],
    [/(diminuir|menor|reduzir).*(fonte|letra|texto)|(fonte|letra|texto) menor/, () => { mudarFonte(-10); return 'Texto menor'; }],
    [/alto contraste|contraste/, () => { alternar('contraste'); return 'Alto contraste'; }],
    [/destacar links|links/, () => { alternar('links'); return 'Links destacados'; }],
    [/reduzir movimento|menos movimento/, () => { alternar('movimento'); return 'Movimento reduzido'; }],
    [/abrir acessibilidade|acessibilidade/, () => { abrirPainel(); return 'Painel de acessibilidade'; }],
    [/fechar/, () => { fecharPainel(false); return 'Painel fechado'; }],
    [/\b(inicio|topo|comeco)\b/, () => { M.irPara('inicio'); return 'Início'; }],
    [/\bsobre\b/, () => { M.irPara('sobre'); return 'Sobre'; }],
    [/solucoes|solucao|o que fazemos/, () => { M.irPara('solucoes'); return 'Soluções'; }],
    [/missao/, () => { M.irPara('missao'); return 'Missão'; }],
    [/visao/, () => { M.irPara('visao'); return 'Visão'; }],
    [/valores/, () => { M.irPara('valores'); return 'Valores'; }],
    [/equipe|organograma|\btime\b/, () => { M.irPara('equipe'); return 'Equipe'; }],
    [/contato|fale conosco|mensagem/, () => { M.irPara('contato'); return 'Contato'; }],
  ];

  function executar(fala) {
    const t = limpar(fala);
    for (const [re, fn] of COMANDOS) {
      if (re.test(t)) { const nome = fn(); dicaVoz.textContent = `Comando entendido: ${nome}.`; M.anunciar(`Comando: ${nome}.`); return; }
    }
    dicaVoz.textContent = `Não entendi "${fala.trim()}". ${DICA_VOZ}`;
  }
  // enquanto a página lê em voz alta, o microfone espera (para não ouvir a própria leitura)
  function pausarVoz() { if (ouvindo && rec) { pausado = true; try { rec.stop(); } catch (e) { /* ok */ } } }
  function retomarVoz() { if (ouvindo && pausado) { pausado = false; try { rec.start(); } catch (e) { /* ok */ } } }

  function ligarVoz() {
    rec = new Reconhecimento();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const r = ev.results[ev.results.length - 1];
      if (r.isFinal && !lendo) executar(r[0].transcript);
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        desligarVoz();
        dicaVoz.textContent = 'O navegador não liberou o microfone. Permita o acesso nas configurações do site e tente de novo.';
      }
    };
    rec.onend = () => { if (ouvindo && !pausado) { try { rec.start(); } catch (e) { /* já iniciado */ } } };
    ouvindo = true;
    try { rec.start(); } catch (e) { /* ok */ }
    botaoVoz.setAttribute('aria-pressed', 'true');
    botaoVoz.textContent = 'Desativar comandos de voz';
    dicaVoz.textContent = `Ouvindo... ${DICA_VOZ}`;
    M.anunciar('Comandos de voz ativados.');
  }
  function desligarVoz() {
    ouvindo = false; pausado = false;
    if (rec) { rec.onend = null; try { rec.stop(); } catch (e) { /* ok */ } }
    botaoVoz.setAttribute('aria-pressed', 'false');
    botaoVoz.textContent = 'Ativar comandos de voz';
  }

  if (!Reconhecimento) {
    botaoVoz.disabled = true;
    dicaVoz.textContent = 'Comandos de voz não estão disponíveis neste navegador. Eles funcionam no Chrome e no Edge.';
  } else {
    botaoVoz.addEventListener('click', () => {
      if (ouvindo) { desligarVoz(); dicaVoz.textContent = DICA_VOZ; M.anunciar('Comandos de voz desativados.'); } else ligarVoz();
    });
  }

  /* ---------- restaurar tudo ---------- */
  $('restaurar').addEventListener('click', () => {
    cfg = { ...PADRAO };
    salvar(); aplicar();
    M.definirTema('auto', false);
    pararLeitura(false);
    if (ouvindo) desligarVoz();
    M.anunciar('Opções de acessibilidade restauradas.');
  });

  aplicar();
})();
