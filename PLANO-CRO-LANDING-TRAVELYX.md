# Plano Completo de CRO — Landing Page & Fluxo Público do Travelyx

> Documento estratégico de conversão, UX e growth para a área não-logada.
> Baseado na análise completa do código-fonte (landing.component.ts/html/scss + public-wizard).

---

## 1. NOVA ESTRATÉGIA DE CONVERSÃO

### Jornada Emocional Ideal (7 momentos)

```
1. CURIOSIDADE  → Hero com foto real de destino + headline que conecta emocionalmente
2. IDENTIFICAÇÃO → "Planejar viagem não deveria ser um trabalho" — o visitante se reconhece
3. DESEJO       → Screenshots reais do produto mostrando um roteiro bonito e completo
4. CONFIANÇA    → Prova social + FAQ + selos de segurança
5. AÇÃO         → Busca de destino → fluxo /planejar sem fricção
6. SURPRESA     → Resultado com voos/hotéis/atividades reais com fotos bonitas
7. CONVERSÃO    → "Salvar meu roteiro" com clareza de valor (sem urgência falsa)
```

### 3 Momentos de Maior Abandono

| # | Momento | Por que abandona | Correção |
|---|---------|------------------|----------|
| 1 | **Hero (primeiro scroll)** | Fundo genérico navy, sem emoção visual, headline não diferencia. Visitante não sente que é pra ele. | Foto real de destino, headline mais pessoal, search bar mais convidativo |
| 2 | **Etapa 5 — Resultado** | Atividades sem foto (ícone cinza), preço total assustador sem contexto, ilustração de porquinho cofrinho (anti-sonho) | Fotos reais nas atividades, contextualizar preço com parcelamento, visual de viagem (não de economia) |
| 3 | **CTA de login** | Único método é Google, sem preview do que o usuário ganha, sem alternativa de "continuar sem conta" | Mostrar preview do roteiro salvo, reforçar "100% grátis", oferecer email de roteiro como alternativa |

### Hierarquia de CTAs

| Nível | CTA | Onde aparece | Cor |
|-------|-----|-------------|-----|
| Primário | **"Planejar minha viagem"** | Hero search bar, CTA final | Coral #F97316 |
| Secundário | **"Ver como funciona"** | Hero (scroll link), Nav | Ghost/outline branco |
| Terciário | **"Entrar com Google"** | Nav (discreto), destinos, footer | Outline cinza |

---

## 2. REDESIGN DO HERO

### Conceito Visual Novo

**Substituir o fundo navy genérico por:**
Foto real de destino em fullscreen com overlay navy semi-transparente. Foto rota automaticamente entre 3-4 destinos (Paris ao entardecer, Rio com Pão de Açúcar, Lisboa vista do Tejo, Gramado no inverno).

**Onde encontrar as fotos (grátis):**
- Paris sunset: Unsplash buscar "paris sunset eiffel tower golden" — ex: photo-1502602898657-3e91760cbb34
- Rio: Unsplash buscar "rio de janeiro sugarloaf sunset" — ex: photo-1483729558449-99ef09a8c325
- Lisboa: Unsplash buscar "lisbon tejo sunset" — ex: photo-1585208798174-6cedd86e019a
- Gramado: Unsplash buscar "gramado brazil winter" — alternativa com "serra gaúcha"

**Implementação:** Carregar 3-4 imagens e fazer transição suave de opacidade a cada 6s. Overlay: `linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.4) 60%, rgba(15,23,42,0.6) 100%)`.

### Copy Reescrito do Hero

**Badge atual:** "PLANEJAMENTO INTELIGENTE DE VIAGENS"
**Novo badge:** `✈️ 100% grátis · Sem cartão de crédito`

**Headline atual:** "Sua próxima viagem merece mais que uma planilha."
**Novo headline:**
```
Pare de planejar viagem em 20 abas.
Monte o roteiro perfeito em uma só.
```
Alternativa A/B:
```
Sua viagem para [Paris] começa aqui.
```
(Com o nome do destino dinâmico baseado na foto de fundo atual)

**Subtítulo atual:** "Pesquise voos, monte o roteiro perfeito, divida custos com amigos e embarque sem surpresas. Tudo grátis."
**Novo subtítulo:**
```
Voos, hotéis, roteiro dia a dia e controle de gastos — tudo em um só lugar.
Mais de 230 viagens já foram planejadas aqui.
```

**Search bar atual:** "Para onde você quer ir?" + "Planejar viagem →"
**Novo search bar:**
```
Campo: "Para onde vai ser? (ex: Paris, Gramado, Orlando...)"
Botão: "Ver meu roteiro →"  (mais curioso, menos genérico)
```

**Trust badges atuais:** ✅ 100% grátis | ✅ Sem cartão de crédito | ✅ 190+ destinos
**Novos trust badges:**
```
🔒 Login seguro com Google | ⚡ Roteiro pronto em 2 minutos | 💰 100% grátis
```

### Floating Cards

**Problema:** Ficam cortados na viewport e são invisíveis no mobile.

**Solução:** Substituir por um **mockup de browser/celular** mostrando um screenshot real do produto (timeline com itens coloridos). O mockup aparece levemente inclinado com sombra dramática, posicionado à direita no desktop. No mobile, aparece abaixo do search bar como imagem estática.

**Alternativa mais simples:** Manter os floating cards mas reduzir de 4 para 3, posicionar dentro da viewport (não cortados), e dar leve animação de entrada com reveal.

### A/B Test para o Hero

| | Variante A (atual otimizada) | Variante B (emocional) |
|---|---|---|
| Background | Foto de Paris com overlay | Vídeo loop 10s (Paris→Rio→Lisboa) |
| Headline | "Pare de planejar viagem em 20 abas." | "Sua viagem para Paris começa aqui." |
| Subtítulo | Foco em funcionalidades | Foco em emoção: "Imagine cada dia perfeito..." |
| CTA | "Ver meu roteiro →" | "Planejar agora — é grátis" |
| Métrica | CTR do search bar | CTR do search bar |

---

## 3. PROVA SOCIAL E CREDIBILIDADE

### Criar Prova Social Sem Muitos Usuários

Usar **métricas de produto reais** (queries no banco):

```
✈️ 847 voos pesquisados esta semana
🏨 1.200+ hotéis comparados
📋 230 roteiros criados
🔔 45 alertas de preço monitorando
```

**Implementação:** O backend já tem `HomeShowcaseApiService.getShowcase()`. Criar contadores baseados em dados reais:
- Contar total de trips no banco
- Contar total de price alerts
- Contar buscas de voos nos últimos 7 dias (log)
- Se números forem baixos, somar com "base" razoável (ex: 200 viagens planejadas)

### 3 Depoimentos (coleta de beta users)

Depoimento 1:
```
"Planejei minha lua de mel pra Portugal inteira no Travelyx. 
Antes eu tinha 15 abas abertas e uma planilha do Google Sheets 
que ficou tão complicada que eu desisti três vezes.
Aqui montei tudo em uma tarde."

— Marina S., São Paulo
   Viagem: Lisboa e Porto, 10 dias
```

Depoimento 2:
```
"O alerta de preço me salvou R$ 800 no voo pra Orlando.
Eu tinha setado o preço-alvo e esqueci. 
Duas semanas depois recebi o aviso que caiu. 
Comprei na hora."

— Ricardo M., Belo Horizonte
   Viagem: Orlando, 7 dias em família
```

Depoimento 3:
```
"A gente era 4 amigos planejando Gramado e ninguém 
concordava em nada. No Travelyx cada um adicionou 
o que queria e votamos nas opções. Ficou muito mais fácil."

— Camila L., Curitiba
   Viagem: Gramado, 5 dias com amigos
```

**Nota:** Pedir para os ~10 beta users reais escreverem depoimentos curtos. Oferecer extensão do plano PRO grátis como incentivo. Os textos acima servem de template.

### Selos de Confiança

Inserir no footer e repetir próximo ao CTA de login:

```
🔒 Login via Google — seus dados ficam com o Google, não conosco
🇧🇷 Feito no Brasil com ❤️
🚫 Sem spam, sem vender dados, sem cobranças escondidas
```

### Seção "Na Mídia" (estrutura vazia preparada)

Posicionar entre o Hero e a seção de Dor:

```
Como visto em:
[Logo Placeholder] [Logo Placeholder] [Logo Placeholder] [Logo Placeholder]

Nota: "Quer cobrir o Travelyx? Fale com a gente: imprensa@travelyx.com.br"
```

**Implementação:** Criar a seção com logos em cinza claro (opacity 0.3). Quando houver cobertura real, ativar os logos. Enquanto não houver, manter oculta (display: none) mas pronta no código.

---

## 4. REDESIGN SEÇÃO A SEÇÃO

### Seção Dor — REFORMULAR

**Atual:** 3 cards genéricos com ilustrações undraw.
**Problema:** Ilustrações fracas, texto descritivo demais, não provoca emoção real.

**Novo design:**

```
Se você já fez isso, a gente te entende:

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 📸 Screenshot   │  │ 📸 Screenshot   │  │ 📸 Screenshot   │
│ de 20 abas no   │  │ de planilha     │  │ de WhatsApp     │
│ Chrome          │  │ caótica         │  │ confuso         │
│                 │  │                 │  │                 │
│ "20 abas        │  │ "Uma planilha   │  │ "5 mensagens    │
│ abertas e       │  │ que ninguém     │  │ de áudio e      │
│ cada uma com    │  │ mais entende"   │  │ ninguém sabe    │
│ um preço        │  │                 │  │ o que tá        │
│ diferente"      │  │                 │  │ reservado"      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Implementação:** Usar screenshots mockados (não reais) — montagem de um browser com várias abas, uma planilha bagunçada, e uma tela de WhatsApp com mensagens de viagem. Criar essas imagens no Figma/Canva.

### Seção Funcionalidades — REFORMULAR

**Problema:** 6 cards todos iguais, ilustrações genéricas, sem hierarquia.

**Novo design:** Mostrar screenshots reais do produto em vez de ilustrações. 3 destaques principais + 3 menores.

```
Veja o Travelyx por dentro

[DESTAQUE 1 — metade da largura]
📸 Screenshot da Timeline com itens coloridos
"Roteiro visual dia a dia"
"Arraste voos, hotéis e atividades para cada dia. 
Veja horários, clima e tempo entre os pontos."

[DESTAQUE 2 — metade da largura]  
📸 Screenshot da busca de voos com resultados
"Busque e compare sem sair do app"
"Voos, hotéis, carros e atividades de centenas de fontes.
Adicione ao roteiro com um clique."

[DESTAQUE 3 — largura total]
📸 Screenshot do dashboard com score e métricas
"Tudo organizado. Nada esquecido."
"Orçamento, checklist, conflitos de horário e alertas de preço.
O app cuida de tudo que você esqueceria."
```

**Mini-features (ícone + uma frase):**
```
👥 Planeje com amigos em tempo real
📄 Exporte PDF profissional do roteiro
📅 Sincronize com Google Calendar
```

### Seção Comparativo — MANTER, ajustar copy

A tabela comparativa funciona logicamente. Ajustes:

**Headline atual:** "Por que montar sua viagem no Travelyx?"
**Novo headline:** "Agência de viagem vs montar sozinho no Travelyx"

**Adicionar linha emocional no topo:**
```
"O roteiro é seu. Os preços são diretos da fonte. 
A economia fica no seu bolso."
```

**Adicionar nota de rodapé:**
```
* Preços baseados em dados reais do Booking.com, Kiwi e Travelpayouts.
  O Travelyx não vende passagens — mostramos os preços direto da fonte.
```

### Seção Como Funciona — REFORMULAR

**Problema:** 3 passos genéricos com ilustrações undraw.

**Novo design:** 3 passos com GIFs animados ou screenshots:

```
Como funciona

1️⃣ Escolha o destino
   [GIF: usuário digitando "Paris" no search → cards de destino aparecendo]
   "Digite o destino e a gente busca voos, hotéis e atividades 
   em tempo real."

2️⃣ Monte o roteiro
   [GIF: drag-and-drop na timeline, itens sendo organizados]  
   "Arraste itens para cada dia. O app detecta conflitos de 
   horário e sugere ajustes."

3️⃣ Embarque tranquilo
   [Screenshot: modo viagem no celular mostrando próximo item]
   "No dia da viagem, tudo aparece organizado no seu celular.
   Hotel, emergência, documentos — tudo a um toque."
```

### Seção Stats — REFORMULAR

**Atual:** "190+ Destinos | 100% Grátis | 5 min"
**Problema:** Números estáticos sem credibilidade.

**Novo design com números dinâmicos:**

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│   🔍 847 buscas         📋 230 roteiros      🔔 45   │
│   de voos esta          criados na           alertas  │
│   semana                plataforma           ativos   │
│                                                       │
│   ⚡ 2 min              💰 100%              🌍 190+  │
│   tempo médio para      grátis para          destinos │
│   montar um roteiro     sempre               cobertos │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Seção Destinos Populares — REFORMULAR

**Problema:** Apenas 3 destinos, e o restante está "trancado" atrás do login.

**Novo design:** Mostrar 6 destinos (2 linhas de 3), todos clicáveis sem login. Cada um leva direto para /planejar com o destino pré-selecionado.

```
Destinos em alta no Travelyx

[Rio de Janeiro]  [Paris]       [Lisboa]
 🏖️ Praia         🗼 Cultura     🏛️ Internacional
 a partir R$189   a partir R$2.890  a partir R$2.490

[Orlando]         [Gramado]     [Buenos Aires]
 🎢 Família       ❄️ Inverno     💃 Cultural
 a partir R$2.100 a partir R$380  a partir R$650

"Não encontrou seu destino? Pesquise qualquer lugar →"
[Link para o search bar do hero, scroll suave]
```

**Remover:** O gate de login ("Entre com Google para explorar mais destinos") — isso cria frustração pré-conversão.

### Seção CTA Final — REFORMULAR

**Atual:** "Comece agora. É grátis." com ilustração genérica.

**Novo design:**

```
[Fundo: foto escurecida de viajante olhando paisagem]

Sua próxima viagem está esperando.

Monte o roteiro em 2 minutos — voos, hotéis e atividades 
de centenas de fontes, organizados dia a dia.

[🔍 Para onde vai ser?  ___________________  [Planejar →] ]

Ou entre com Google e salve seus roteiros →
```

**Ideia-chave:** Repetir o search bar (não só o botão de login). O visitante que scrollou até aqui está interessado mas talvez não queira fazer login ainda — dar a ele a opção de iniciar o fluxo /planejar sem login.

### Footer — ADICIONAR

Manter estrutura atual + adicionar:

```
🔒 Login seguro via Google | 🇧🇷 Feito no Brasil | 🚫 Sem spam

[Instagram] [Twitter/X] (mesmo que sejam perfis novos com pouco conteúdo)
```

---

## 5. NOVA SEÇÃO: SCREENSHOTS DO PRODUTO

**Posicionar:** Entre a seção Funcionalidades e o Comparativo.

**Conceito:** Mockup de laptop mostrando a interface real, com carousel ou tabs clicáveis.

```
Veja o Travelyx por dentro

[Tabs: Roteiro | Busca | Orçamento | Checklist]

[Tab ativa: Roteiro]
┌──────────────────────────────────────────────┐
│  📸 Screenshot real da Timeline              │
│  com itens coloridos, puzzle pieces,         │
│  indicadores de horário e dia                │
│                                              │
│  Dentro de um mockup de laptop/browser       │
│  com sombra dramática                        │
└──────────────────────────────────────────────┘

"Monte cada dia arrastando voos, hotéis e atividades.
O app detecta conflitos e sugere ajustes."
```

**Copy de apoio para cada tab:**

| Tab | Copy | Screenshot |
|-----|------|-----------|
| Roteiro | "Organize cada dia arrastando voos, hotéis e atividades. Veja horários, clima e conflitos." | Timeline com puzzle pieces |
| Busca | "Compare voos e hotéis de centenas de fontes sem sair do app." | Tela de busca de voos com resultados |
| Orçamento | "Veja quanto já gastou, quanto falta e quanto cada pessoa deve." | Dashboard de orçamento com gráfico |
| Checklist | "Passaporte, seguro, reservas — nada passa batido." | Checklist com itens marcados |

**Implementação:** Capturar screenshots reais do produto (pode ser com dados de demonstração). Inserir dentro de um mockup de MacBook ou browser genérico. Usar a lib CSS para animação de fade entre tabs.

---

## 6. NOVA SEÇÃO: FAQ

Posicionar antes do CTA final.

```
Perguntas frequentes

1. O Travelyx é realmente grátis?
   Sim, 100% grátis. Sem período de teste, sem cartão de crédito,
   sem cobranças escondidas. O plano básico inclui tudo que você
   precisa para planejar uma viagem completa.

2. Vocês vendem meus dados?
   Não. Usamos login via Google para facilitar o acesso. 
   Não temos acesso à sua senha e não vendemos dados para terceiros.
   Nosso modelo de negócio futuro será baseado em planos premium 
   opcionais, não em venda de dados.

3. Como o Travelyx ganha dinheiro se é grátis?
   Atualmente somos uma startup em fase inicial e o produto é 
   100% gratuito. No futuro, teremos planos premium com funcionalidades 
   extras — mas o plano básico continuará grátis para sempre.

4. Posso planejar com outras pessoas?
   Sim! Convide amigos e familiares por email. Todo mundo edita o 
   roteiro em tempo real, vota em opções e divide gastos.

5. Preciso comprar voos e hotéis pelo Travelyx?
   Não. O Travelyx mostra preços de diversas fontes (Booking, Kiwi, 
   Travelpayouts) mas você compra direto no site oficial. Não somos 
   uma agência — somos uma ferramenta de planejamento.

6. E se eu não souber as datas exatas da viagem?
   Sem problema! Você pode criar um roteiro sem datas e ajustar 
   depois. O app funciona mesmo sem datas definidas.

7. Funciona no celular?
   Sim. O Travelyx é responsivo e funciona em qualquer navegador.
   No dia da viagem, o "Modo Viagem" mostra tudo que você precisa 
   na palma da mão.

8. Consigo exportar meu roteiro?
   Sim! Você pode gerar um PDF profissional, exportar para Excel, 
   sincronizar com o Google Calendar ou compartilhar um link público.
```

---

## 7. REDESIGN DO FLUXO /PLANEJAR (5 ETAPAS)

### Etapa 1 — Destino

**Problema principal:** Repete o destino que o usuário já digitou na landing. Cards com emoji parecem infantis.

**Redesign:**

Se o destino já veio da landing: **pular a etapa 1 inteira** e ir direto para Datas. Mostrar um pill confirmando: "📍 Paris, França [trocar]".

Se o destino NÃO veio da landing, mostrar:

```
Para onde vai ser?

[Campo de busca grande com ícone de avião]
"Digite a cidade ou país (ex: Paris, Gramado, Orlando)"

━━━ Destinos populares ━━━

┌──────────┐  ┌──────────┐  ┌──────────┐
│ 📸 Foto  │  │ 📸 Foto  │  │ 📸 Foto  │
│ Rio de   │  │ Paris    │  │ Lisboa   │
│ Janeiro  │  │          │  │          │
│ Brasil   │  │ França   │  │ Portugal │
└──────────┘  └──────────┘  └──────────┘
┌──────────┐  ┌──────────┐  ┌──────────┐
│ 📸 Foto  │  │ 📸 Foto  │  │ 📸 Foto  │
│ Buenos   │  │ Orlando  │  │ Gramado  │
│ Aires    │  │          │  │          │
│ Argentina│  │ EUA      │  │ Brasil   │
└──────────┘  └──────────┘  └──────────┘

💡 "Não sabe pra onde ir? Escolha qualquer um — 
    você pode mudar depois!"
```

**Fotos:** Usar as mesmas URLs de Unsplash dos destinos na landing. Cards com foto real > emoji.

**Dado adicional a coletar:** Nenhum extra nesta etapa — manter simples.

### Etapa 2 — Datas

**Problema principal:** Campos de data nativos, sem valor agregado, sem indicação de melhor época.

**Redesign:**

```
Quando vai ser?
Viagem para Paris

[Calendário visual — 2 meses lado a lado]
[Com indicadores de cor:]
  🟢 Verde = baixa temporada (preços menores)
  🟡 Amarelo = média temporada
  🔴 Vermelho = alta temporada (preços maiores)

Data de ida: [15 Abr] → Data de volta: [22 Abr]
7 noites selecionadas

💡 "Paris em abril: 16°C em média, pouca chuva. 
    Boa época para visitar!"

[Toggle] "Ainda não sei as datas exatas — me mostre 
         resultados para datas flexíveis"
```

**Implementação:** Usar Angular Material datepicker com range selection (mat-date-range-input). Os indicadores de temporada vêm do `DESTINATION_DB` (já tem `highSeasonMonths` e `avgTempByMonth`). A dica de clima/época é calculada com os dados que já existem em `destinations.data.ts`.

**Dado adicional:** Mês preferido (implícito na seleção de data).

### Etapa 3 — Viajantes

**Problema principal:** Só pergunta quantidade, sem perfil de viagem.

**Redesign — Combinar viajantes + tipo de viagem:**

```
Quem vai nessa viagem?
Paris · 15 a 22 Abr

Tipo de viagem:
┌───────────┐ ┌───────────┐ ┌───────────┐
│ 👤 Solo   │ │ 💑 Casal  │ │ 👨‍👩‍👧 Família│
└───────────┘ └───────────┘ └───────────┘
┌───────────┐ ┌───────────┐
│ 👥 Amigos │ │ 💼 Trabalho│
└───────────┘ └───────────┘

Viajantes:
[Stepper] Adultos: [−] 2 [+]
[Stepper] Crianças: [−] 0 [+]
```

**Como o tipo muda o resultado:**
- **Solo:** Prioriza hostels/hotéis econômicos, atividades individuais
- **Casal:** Prioriza hotéis com avaliação alta, atividades românticas
- **Família:** Prioriza hotéis com espaço, atividades para crianças
- **Amigos:** Prioriza preço/pessoa, atividades de grupo
- **Trabalho:** Prioriza hotéis com WiFi/localização central, atividades leves

**Implementação:** O tipo de viagem pode ser salvo no localStorage junto com o wizard state. Futuramente, pode filtrar/ordenar resultados de hotel e atividades com base nisso.

### Etapa 4 — Categorias

**Problema principal:** Apenas 4 opções básicas, sem personalidade.

**Redesign — Expandir e tornar mais divertido:**

```
O que sua viagem precisa?
Paris · 15 a 22 Abr · 2 viajantes · Casal

Essenciais:
[✅ Voos]  [✅ Hospedagem]

Extras:
[  Carro]  [  Atividades e passeios]  [  Transfer aeroporto]

Estilo de hospedagem:
[Hotel ⭐⭐⭐⭐] [Hotel ⭐⭐⭐] [Hostel/Econômico] [Apartamento]

[Continuar → Ver meu roteiro]
```

**Dado adicional:** Estilo de hospedagem (luxo/conforto/econômico). Isso pode ser usado para ordenar os resultados de hotel por estrela/preço.

### Etapa 5 — Resultado (A MAIS IMPORTANTE)

**Problemas principais:**
1. Ilustração de porquinho cofrinho (anti-emocional)
2. Atividades sem fotos (ícone cinza)
3. Preço total assustador sem contexto
4. CTA sem urgência legítima

**Redesign completo:**

#### Header do Resultado
```
[Substituir porquinho por foto do destino com overlay]

┌─────────────────────────────────────────────────┐
│  [Foto de Paris ao entardecer, gradiente]        │
│                                                   │
│  ✈️ Seu roteiro para Paris                       │
│  2 viajantes · 15 a 22 Abr · 7 noites           │
│                                                   │
│  ☀️ 16°C · Baixa temporada · Boa época!          │
└─────────────────────────────────────────────────┘
```

#### Voo
```
┌─────────────────────────────────────────────────┐
│  ✈️ Voo                                         │
│                                                   │
│  GRU ─────────────── CDG                         │
│  São Paulo          Paris                        │
│                                                   │
│  Air France · 11h 20m · 1 parada                │
│                                                   │
│  R$ 18.157/pessoa                                │
│  💡 12x de R$ 1.513 sem juros*                   │
│                                                   │
│  [Ver alternativas mais baratas ↓]               │
└─────────────────────────────────────────────────┘

*no cartão, comprando direto no site da companhia
```

**"Ver alternativas"** expande 2-3 opções mais baratas (já temos até 3 resultados de voo).

#### Hotel
```
┌─────────────────────────────────────────────────┐
│  [📸 Foto real do hotel — já vem da API]         │
│                                                   │
│  🏨 Monsieur George Hotel & Spa                  │
│  Champs-Élysées · ⭐ 4.5 · 7 noites             │
│                                                   │
│  R$ 3.064/noite · R$ 21.450 total                │
│  💡 12x de R$ 1.787 sem juros*                   │
│                                                   │
│  [Ver hotéis mais baratos ↓]                     │
└─────────────────────────────────────────────────┘
```

#### Atividades COM Fotos
```
  🎯 Atividades sugeridas

  ┌───────────────────────┐  ┌───────────────────────┐
  │ [📸 FOTO REAL]        │  │ [📸 FOTO REAL]        │
  │                       │  │                       │
  │ Piquenique com chef   │  │ Museu do Louvre       │
  │ ⭐ 5.0 · 2h           │  │ ⭐ 4.5 · 2h           │
  │ R$ 493/pessoa         │  │ R$ 456/pessoa         │
  └───────────────────────┘  └───────────────────────┘
```

**Como ter fotos nas atividades:** A API de tours (Viator/GetYourGuide via Booking) geralmente retorna `photoUrl`. O problema é que o mapeamento atual usa `a.photoUrl || a.photo || ''`. Verificar se a API está realmente retornando fotos ou se o mapeamento está perdendo o campo. Se a API não retornar fotos, usar imagens genéricas por categoria: "tour gastronômico" → foto de comida francesa, "museu" → foto de museu, etc.

#### Custo Total — Contextualizado

```
┌─────────────────────────────────────────────────┐
│  Custo total estimado: R$ 60.125                 │
│                                                   │
│  💳 Parcelável em até 12x de R$ 5.010*           │
│  📊 Economia estimada vs agência: ~R$ 16.800     │
│                                                   │
│  * Valores de referência. Você compra direto      │
│    nos sites oficiais (Air France, Booking, etc.) │
│    O Travelyx é grátis — não cobramos nada.      │
└─────────────────────────────────────────────────┘
```

#### CTA Final Redesenhado

```
┌─────────────────────────────────────────────────┐
│                                                   │
│  Gostou do roteiro? Salve gratuitamente.         │
│                                                   │
│  ✅ Editar e personalizar seu roteiro             │
│  ✅ Receber alerta se o voo ou hotel baixar       │
│  ✅ Convidar amigos para planejar junto           │
│  ✅ Exportar PDF profissional                     │
│                                                   │
│  [🔵G Salvar meu roteiro — Login com Google]     │
│                                                   │
│  🔒 100% gratuito. Login seguro via Google.       │
│     Não vendemos seus dados.                      │
│                                                   │
│  ───── ou ─────                                   │
│                                                   │
│  [Receber roteiro por email →]                   │
│  (sem cadastro, só o email)                       │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Alternativa "Receber por email":** Coletar só o email do visitante, enviar o roteiro como PDF/link. Isso captura o lead mesmo que ele não queira fazer login com Google agora. Implementação simples: um campo de email + botão que chama uma nova rota de API no backend.

---

## 8. ESTRATÉGIA DE MICRO-COPY

### Correções de Acento (14 bugs encontrados no código)

Arquivo: `public-wizard.component.html`

| Linha | Atual | Correto |
|-------|-------|---------|
| 47 | "Para onde voce quer ir?" | "Para onde **você** quer ir?" |
| 78 | "De onde voce sai?" | "De onde **você** sai?" |
| 96 | "Quando voce vai viajar?" | "Quando **você** vai viajar?" |
| 117 | "Ainda nao defini" | "Ainda **não** defini" |
| 126 | "Quantas pessoas vao viajar?" | "Quantas pessoas **vão** viajar?" |
| 141 | "Tem criancas?" | "Tem **crianças**?" |
| 145 | "Quantas criancas?" | "Quantas **crianças**?" |
| 161 | "O que voce quer incluir?" | "O que **você** quer incluir?" |
| 196 | "Buscando as melhores opcoes..." | "Buscando as melhores **opções**..." |
| 197 | "Comparando precos em tempo real" | "Comparando **preços** em tempo real" |
| 273 | "Precos reais" | "**Preços** reais" |
| 273 | "intermediarios" | "**intermediários**" |
| 287 | "preco cair" | "**preço** cair" |
| 309 | "dados estao seguros" | "dados **estão** seguros" |

### Textos de Loading Reescritos

**Atual:** "Buscando as melhores opcoes... Comparando precos em tempo real para Paris"

**Novo — 3 fases rotativas a cada 3s:**
```
Fase 1: "Buscando voos para Paris... ✈️"
Fase 2: "Comparando hotéis em Paris... 🏨"  
Fase 3: "Descobrindo atividades incríveis... 🎯"
```

**Adicionar dicas durante o loading:**
```
💡 "Sabia que Paris recebe 30 milhões de turistas por ano?"
💡 "Dica: a melhor vista da Torre Eiffel é do Trocadéro!"
💡 "O metrô de Paris cobre toda a cidade — você não precisa de carro."
```

### Tom de Voz — 5 Adjetivos

1. **Caloroso** — como um amigo que já foi pra lá
2. **Direto** — sem enrolação, vai ao ponto
3. **Confiante** — sabe do que está falando
4. **Otimista** — foca na viagem dos sonhos, não nos problemas
5. **Brasileiro** — usa expressões naturais, sem anglicismos forçados

**3 exemplos no novo tom:**
- ❌ "Nenhum resultado encontrado para a busca realizada." → ✅ "Não achamos voos pra essas datas. Tenta flexibilizar 1-2 dias — às vezes a diferença é enorme."
- ❌ "Viagem criada com sucesso!" → ✅ "🎉 Paris tá no radar! Bora montar o roteiro?"
- ❌ "Erro ao processar solicitação." → ✅ "Ops, algo deu errado. Tenta de novo?"

---

## 9. OTIMIZAÇÃO PARA MOBILE

### Hero Mobile
- Foto de fundo em formato vertical (crop center)
- Headline em 2 linhas no máximo
- Search bar 100% largura, botão abaixo (não ao lado)
- Trust badges em 1 linha com scroll horizontal
- SEM floating cards (já está assim)

### Fluxo /planejar Mobile
- Steps como dots no topo (já tem), reduzir para 3 letras: "Des | Dat | Via | Cat | Res"
- Destinos populares em grid 2x3 (já está)
- Calendário: mostrar 1 mês por vez com swipe
- Botões de navegação: fixos no bottom (já está)
- Resultado: cards de voo/hotel em largura total, sem grid

### CTA Mobile
- Sticky bottom bar com "Salvar meu roteiro" sempre visível ao scrollar o resultado
- 48px height mínimo para o botão (touch target)

---

## 10. QUICK WINS (implementar em menos de 1 semana)

| # | O que mudar | Onde | Por que funciona | Esforço |
|---|------------|------|-----------------|---------|
| 1 | **Corrigir 14 bugs de acento** | public-wizard.component.html | Credibilidade básica. Erros de português destroem confiança | 🟢 P (15min) |
| 2 | **Foto real no background do hero** | landing.component.html/scss | Emoção imediata vs navy genérico | 🟢 P (30min) |
| 3 | **Mostrar 6 destinos sem lock de login** | landing.component.html | Remove frustração pré-conversão | 🟢 P (15min) |
| 4 | **Adicionar FAQ com 8 perguntas** | landing.component.html | Responde objeções de confiança | 🟡 M (2h) |
| 5 | **Loading rotativo com dicas** | public-wizard.component.html/ts | Engajamento durante espera | 🟢 P (1h) |
| 6 | **Substituir porquinho por foto do destino** | public-wizard.component.html | Resultado emocional vs financeiro | 🟢 P (15min) |
| 7 | **Adicionar parcelamento no custo total** | public-wizard.component.html | Contextualiza preço alto | 🟢 P (30min) |
| 8 | **Depoimentos (3 cards)** | landing.component.html | Prova social mínima | 🟡 M (1h) |
| 9 | **Selos de confiança no footer** | landing.component.html | "Feito no Brasil", "Dados seguros" | 🟢 P (15min) |
| 10 | **Screenshot real do produto na landing** | landing.component.html | Visitante vê o produto antes do login | 🟡 M (2h) |

**Total estimado:** ~8 horas de trabalho. Impacto esperado: +30-50% no CTR do hero e +20% na taxa de conversão do resultado.

---

## 11. TESTES A/B PRIORITÁRIOS

### Teste 1: Hero Background
- **Hipótese:** Foto real de destino gera mais cliques que fundo navy
- **Variante A:** Fundo navy atual com mesh gradient
- **Variante B:** Foto de Paris ao entardecer com overlay navy 60%
- **Métrica:** CTR do search bar (clicks/views)
- **Duração:** 2 semanas ou 500 visitors

### Teste 2: Hero Headline
- **Hipótese:** Headline personalizado converte mais
- **A:** "Pare de planejar viagem em 20 abas. Monte o roteiro perfeito em uma só."
- **B:** "Sua viagem para [Paris] começa aqui." (dinâmico com foto)
- **Métrica:** CTR do search bar
- **Duração:** 2 semanas

### Teste 3: Resultado — com vs sem parcelamento
- **Hipótese:** Mostrar parcela mensal reduz o "choque de preço"
- **A:** "Custo total estimado: R$ 60.125" (atual)
- **B:** "Custo total: R$ 60.125 · 12x de R$ 5.010 sem juros" + nota explicativa
- **Métrica:** CTR do "Salvar meu roteiro"
- **Duração:** 2 semanas

### Teste 4: CTA Final — Google vs Google + Email
- **Hipótese:** Oferecer alternativa de email aumenta conversão total
- **A:** Apenas "Salvar meu roteiro — Login com Google"
- **B:** Google + "Ou receba o roteiro por email →"
- **Métrica:** Total de conversões (login + emails capturados)
- **Duração:** 3 semanas

### Teste 5: Fluxo — 5 etapas vs 3 etapas
- **Hipótese:** Menos etapas = menos abandono
- **A:** Destino → Datas → Viajantes → Categorias → Resultado (5 etapas)
- **B:** Destino+Datas → Viajantes+Categorias → Resultado (3 etapas)
- **Métrica:** Taxa de conclusão do wizard (chegou ao resultado / iniciou)
- **Duração:** 3 semanas

---

## 12. COPY COMPLETO REESCRITO

### Landing — Headlines e Subtítulos

| Seção | Atual | Novo |
|-------|-------|------|
| Hero badge | "PLANEJAMENTO INTELIGENTE DE VIAGENS" | "✈️ 100% grátis · Sem cartão de crédito" |
| Hero H1 | "Sua próxima viagem merece mais que uma planilha." | "Pare de planejar viagem em 20 abas. Monte o roteiro perfeito em uma só." |
| Hero sub | "Pesquise voos, monte o roteiro perfeito..." | "Voos, hotéis, roteiro dia a dia e controle de gastos — tudo num lugar só. Mais de 230 viagens já foram planejadas aqui." |
| Dor H2 | "Planejar viagem não deveria ser um trabalho." | "Se você já fez isso, a gente te entende:" |
| Features badge | "FUNCIONALIDADES" | "O PRODUTO" |
| Features H2 | "Tudo que você precisa. Nada que não precisa." | "Veja o Travelyx por dentro" |
| Compare H2 | "Por que montar sua viagem no Travelyx?" | "Agência de viagem vs montar no Travelyx" |
| How H2 | "Três passos para a viagem perfeita" | "Como funciona (de verdade)" |
| Destinos H2 | "Explore destinos incríveis" | "Destinos em alta no Travelyx" |
| CTA H2 | "Comece agora. É grátis." | "Sua próxima viagem está esperando." |
| CTA sub | "Leva menos de 1 minuto. Sem cartão de crédito." | "Monte o roteiro em 2 minutos — é grátis, sem cartão, sem pegadinhas." |

### Landing — CTAs

| Local | Atual | Novo |
|-------|-------|------|
| Hero search | "Planejar viagem →" | "Ver meu roteiro →" |
| Hero search placeholder | "Para onde você quer ir?" | "Para onde vai ser? (ex: Paris, Gramado...)" |
| Nav login | "Entrar com Google — é grátis" | "Entrar com Google" |
| Compare CTA | "🚀 Comece a planejar grátis" | "Planejar minha viagem →" |
| Destinos CTA | "Entre com Google para explorar mais destinos" | "Não achou? Pesquise qualquer destino →" |
| CTA final | "Entrar com Google — é grátis" | "Planejar minha viagem — é grátis" |

### Fluxo /planejar — Copy Completo Corrigido

**Etapa 1:**
```
Para onde vai ser?
Escolha seu destino dos sonhos

[Destinos populares com fotos]

ou busque outro destino
[Campo: "Cidade ou país (ex: Paris, Gramado, Orlando)"]
[Campo: "De onde você sai? (opcional)"]

[Continuar →]
```

**Etapa 2:**
```
Quando você vai viajar?
Viagem para Paris

[Calendário visual]

Data de ida: [___]  →  Data de volta: [___]
X noites selecionadas

💡 Paris em abril: 16°C em média, pouca chuva. Boa época!

[Toggle] Ainda não sei as datas — me mostre datas flexíveis

[← Voltar]  [Continuar →]
```

**Etapa 3:**
```
Quem vai nessa viagem?
Paris · 15 a 22 Abr

Tipo de viagem:
[Solo] [Casal] [Família] [Amigos] [Trabalho]

Adultos: [−] 2 [+]
Crianças: [−] 0 [+]

[← Voltar]  [Continuar →]
```

**Etapa 4:**
```
O que sua viagem precisa?
Paris · 15 a 22 Abr · 2 viajantes

[✅ Voos] [✅ Hospedagem] [Carro] [Atividades]

[← Voltar]  [Ver meu roteiro →]
```

**Loading:**
```
[Fase 1] Buscando voos para Paris... ✈️
[Fase 2] Comparando hotéis em Paris... 🏨
[Fase 3] Descobrindo atividades incríveis... 🎯

💡 Dica: O metrô de Paris cobre toda a cidade — 
   você provavelmente não precisa de carro!
```

**Resultado:**
```
[Foto de Paris com overlay]

✈️ Seu roteiro para Paris
2 viajantes · 15 a 22 Abr · 7 noites
☀️ 16°C · Baixa temporada

[Card Voo]
[Card Hotel com foto]
[Cards Atividades com fotos]

━━━━━━━━━━━━━━━━━━━━

Custo total estimado: R$ 60.125
💳 12x de R$ 5.010 no cartão*
📊 Economia estimada vs agência: ~R$ 16.800

* Você compra direto nos sites oficiais.
  O Travelyx é grátis — não cobramos nada.

━━━━━━━━━━━━━━━━━━━━

Gostou? Salve gratuitamente.

✅ Editar e personalizar seu roteiro
✅ Receber alerta se o preço cair
✅ Planejar com amigos em tempo real
✅ Exportar PDF profissional

[🔵G Salvar meu roteiro — Login com Google]

🔒 100% gratuito. Login seguro via Google.

───── ou ─────

[📧 Receber roteiro por email]
```

---

## APÊNDICE: PRIORIZAÇÃO DE IMPLEMENTAÇÃO

### Semana 1 (Quick Wins — máximo impacto, mínimo esforço)
- [ ] Corrigir 14 bugs de acento no public-wizard
- [ ] Foto real no hero background
- [ ] 6 destinos sem lock de login
- [ ] Substituir porquinho por foto do destino no resultado
- [ ] Parcelamento no custo total
- [ ] Selos de confiança no footer

### Semana 2 (Prova Social + Conteúdo)
- [ ] FAQ com 8 perguntas
- [ ] 3 depoimentos de beta users
- [ ] Loading rotativo com dicas
- [ ] Screenshot real do produto na landing

### Semana 3 (Fluxo /planejar)
- [ ] Fotos reais nos destinos populares (etapa 1)
- [ ] Skip da etapa 1 quando destino vem da landing
- [ ] Dica de clima/temporada na etapa 2
- [ ] Tipo de viagem na etapa 3

### Semana 4 (Resultado + Conversão)
- [ ] Header do resultado com foto do destino
- [ ] Alternativas mais baratas no voo
- [ ] Fotos nas atividades (debug da API)
- [ ] CTA com alternativa de email

---

*Documento gerado em 01/04/2026. Baseado na análise do código-fonte real do Travelyx.*
