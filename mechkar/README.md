# Site da MechKar Systems

Site estático em HTML, CSS e JavaScript puros (sem instalar nada).

## Como abrir
Dê dois cliques no `index.html` ou publique a pasta inteira em qualquer hospedagem estática (Vercel, Netlify, GitHub Pages).

## Estrutura
- `index.html`: o conteúdo (início, sobre, soluções, missão/visão/valores, ODS 9, organograma, contato).
- `css/style.css`: estilos, temas claro/escuro e modos de acessibilidade.
- `js/main.js`: tema claro/escuro, menu do celular, animações, link ativo no menu e formulário.
- `js/acessibilidade.js`: painel de acessibilidade.
- `assets/img/`: símbolo do logo (fundo transparente), favicon e fotos da equipe.

## Modo claro e escuro
O botão de lua/sol no topo alterna. Na primeira visita o site segue o tema do aparelho (`prefers-color-scheme`);
a escolha fica salva no navegador. No painel de acessibilidade também há a opção "Automático".

## Acessibilidade
Abra pelo botão de pessoa no topo ou com o atalho **Alt + A**.
- Tamanho do texto (80% a 170%), fonte de fácil leitura (Atkinson Hyperlegible), mais espaço entre letras e linhas.
- Alto contraste, destacar links, reduzir movimento e cursor grande.
- **Leitura em voz alta** (Web Speech API, `SpeechSynthesis`): lê a página ou o trecho selecionado, com controle de velocidade.
- **Comandos de voz** (Web Speech API, `SpeechRecognition`, Chrome/Edge): "ir para equipe", "contato", "missão", "modo escuro",
  "modo claro", "aumentar fonte", "diminuir fonte", "alto contraste", "ler página", "parar".
- **VLibras**: widget oficial do governo federal que traduz o conteúdo para Libras (botão azul na lateral). Precisa de internet.
- Também: link "Pular para o conteúdo", navegação completa por teclado, foco visível, regiões ARIA, avisos para leitor de tela
  e respeito a `prefers-reduced-motion`, `prefers-contrast` e `forced-colors`.
- As escolhas ficam salvas no navegador (`localStorage`).

## Formulário de contato
Valida os campos (com mensagens acessíveis), mas **ainda não envia** os dados para lugar nenhum.
Para ligar de verdade, edite o final do `submit` em `js/main.js` (há um comentário no local).

## Observações
- As fontes (Montserrat, Inter e Atkinson Hyperlegible) vêm do Google Fonts; sem internet o site usa fontes do sistema.
- Os textos de Sobre, Missão, Visão e Valores são os que a MechKar forneceu.
