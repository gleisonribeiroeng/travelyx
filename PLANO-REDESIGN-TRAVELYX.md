# Plano Completo de Redesign e Melhoria — Travelyx

> Documento estratégico de produto, UX e growth.
> Baseado na análise completa do código-fonte, design system, copy e arquitetura existentes.

---

## 1. NOVA PROPOSTA DE VALOR E POSICIONAMENTO

### Tagline Atual (problema)
> "Planeje e organize suas próximas aventuras"

Genérico. Poderia ser qualquer app de produtividade. Não emociona, não diferencia.

### Nova Tagline
> **"Da ideia ao embarque. Tudo no mesmo lugar."**

Alternativas por contexto:
- Hero principal: **"Pare de planejar viagem em 20 abas. Comece a sonhar em uma só."**
- Meta description: **"Pesquise voos, monte roteiros dia a dia, divida gastos com amigos e viaje sem surpresas. Grátis."**
- Compartilhamento social: **"Minha viagem tá toda organizada no Travelyx. Vem planejar comigo."**

### Personalidade de Marca

| Dimensão | Definição |
|----------|-----------|
| Tom de voz | Amigo viajante experiente — não um robô corporativo. Fala "você", usa humor leve, comemora conquistas. |
| Adjetivos | Caloroso, confiável, esperto, descomplicado |
| NÃO é | Formal, técnico, infantil, arrogante |
| Comparação | Se o Notion é o amigo organizado e o Instagram é o amigo divertido, o Travelyx é o **amigo que já foi pra lá e te manda o roteiro completo no WhatsApp**. |

### Manifesto da Marca (3 frases)

> **Viajar é a melhor coisa que o dinheiro compra. Planejar não deveria ser a pior.**
> O Travelyx existe para que o tempo que você gasta organizando sua viagem seja tão prazeroso quanto a viagem em si.
> Pesquise, planeje, divida e embarque — tudo em um lugar que entende que cada viagem é única.

---

## 2. REDESIGN DO ONBOARDING (Primeiros 5 minutos)

### Problema Atual
Após login com Google, o usuário cai direto em "Minhas Viagens" vazio. Nenhum guia, nenhuma ação sugerida. A taxa de abandono é previsível: o usuário não sabe o que fazer.

### Novo Fluxo — 4 Telas (60 segundos)

#### Tela 1: Boas-vindas Personalizada
```
[Foto do avatar Google do usuário em círculo]

Oi, {nome}! 👋
Que bom ter você aqui.

Vamos personalizar sua experiência em 30 segundos?

[Botão: "Bora lá" (coral, grande)]
[Link discreto: "Pular e explorar"]
```

#### Tela 2: Perfil de Viajante (3 perguntas rápidas)
```
Como você costuma viajar?

[Cards clicáveis com ilustração + texto, seleção múltipla:]

🎒 Mochileiro    — Hostel, transporte público, muita aventura
👨‍👩‍👧‍👦 Família     — Conforto, segurança, atividades para todos
💑 Casal         — Romântico, experiências especiais
👥 Amigos        — Dividir tudo, muita diversão
💼 Trabalho      — Prático, rápido, sem enrolação

Qual é seu foco ao planejar?
[Chips selecionáveis:]
○ Economizar ao máximo
○ Melhor custo-benefício  
○ Conforto acima de tudo

Já tem uma viagem em mente?
○ Sim, já sei para onde vou!
○ Estou pesquisando destinos
○ Só quero explorar o app
```

**Dados coletados → Uso imediato:**
- Perfil de viajante → Personaliza sugestões de hospedagem (hostel vs resort)
- Foco de planejamento → Ordena resultados de busca (menor preço vs melhor avaliação)
- Intenção → Decide o próximo passo (criar viagem vs ver inspiração)

#### Tela 3: Primeira Viagem Guiada (para quem respondeu "Sim, já sei para onde vou")
```
Vamos criar sua primeira viagem!

[Campo grande, elegante:]
Para onde você vai?
[Autocomplete com destinos populares como sugestão: "Rio de Janeiro", "Lisboa", "Orlando"...]

Quando?
[Date range picker visual, estilo calendário]

Quem vai com você?
[Stepper: 1 pessoa / 2 / 3+ com ícones]

[Botão: "Criar minha viagem ✈️"]
```

#### Tela 4: Momento "Aha!" — Viagem Criada com Conteúdo
```
[Animação: avião traça rota no mapa do Brasil até o destino]

🎉 Sua viagem para {destino} está criada!

[Card da viagem já aparece com:]
- Foto do destino (Unsplash, já integrado)
- Contagem regressiva: "Faltam X dias!"
- Clima previsto: "☀️ 28°C em média em {mês}"
- 3 cards sugeridos:
  ✈️ "Voos a partir de R$ XXX" → linka para busca de voos
  🏨 "Hotéis populares em {destino}" → linka para hospedagem
  🎯 "Top 5 atividades em {destino}" → linka para atividades

[Botão: "Explorar minha viagem"]
[Link: "Ver Planejamento Guiado passo a passo"]
```

### Para quem respondeu "Estou pesquisando destinos"
Redirecionar para uma **Home de Inspiração** (ver seção 3) com destinos populares, viagens em destaque e estimativas de custo.

---

## 3. REDESIGN DA HOME / MINHAS VIAGENS

### Problema Atual
Tela "Minhas Viagens" é uma lista fria de cards. Sem emoção, sem inspiração, sem motivo para voltar. Para usuários sem viagem, é um vazio desolador.

### Nova Estrutura — 3 Blocos

#### Bloco 1: Próxima Viagem (destaque hero)
Se o usuário tem uma viagem futura, ela domina a tela:

```
┌─────────────────────────────────────────────────┐
│  [Foto grande do destino, gradiente escuro]      │
│                                                   │
│  🇵🇹 LISBOA                                      │
│  12 a 19 de Julho · 7 noites                     │
│                                                   │
│  ┌──────┐  ┌──────────┐  ┌──────────┐           │
│  │  23  │  │ 🌤️ 24°C  │  │ €1 = R$6 │           │
│  │ dias │  │  média   │  │  câmbio  │           │
│  └──────┘  └──────────┘  └──────────┘           │
│                                                   │
│  Próximo passo: Reservar hospedagem →            │
│                                                   │
│  [Continuar planejando]  [Compartilhar]          │
└─────────────────────────────────────────────────┘
```

**Elementos novos:**
- **Contagem regressiva grande** (já existe parcialmente no dashboard, promover para cá)
- **Clima do destino** na data da viagem (usar API gratuita como Open-Meteo)
- **Câmbio em tempo real** (para viagens internacionais)
- **"Próximo passo"** — a ação mais impactante que falta (derivada do score de readiness)
- **Barra de progresso sutil** na base do card (% do planejamento)

#### Bloco 2: Outras Viagens (grid compacto)
```
Suas viagens                        [+ Nova viagem]

[Card compacto] [Card compacto] [Card compacto]
  Lisboa          Gramado          Orlando 2025
  Jul 2026        Dez 2025         (rascunho)
  ██████░░ 75%    ████████ 100%    ██░░░░░░ 20%
```

Cards menores, focados em:
- Nome + foto pequena
- Barra de progresso colorida (verde = pronta, laranja = em andamento, cinza = rascunho)
- Status em uma palavra
- Sem estatísticas detalhadas (essas vão no dashboard da viagem)

#### Bloco 3: Inspiração e Descoberta
```
✨ Destinos em alta

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 📸       │ │ 📸       │ │ 📸       │ │ 📸       │
│ Santiago  │ │ Jericoa- │ │ Montevidéu│ │ Bonito   │
│ a partir │ │ coara    │ │ a partir  │ │ a partir │
│ R$ 890   │ │ R$ 450   │ │ R$ 720    │ │ R$ 380   │
│ ✈️ voo   │ │ ✈️ voo   │ │ ✈️ voo    │ │ ✈️ voo   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

[Baseado no aeroporto mais próximo do usuário]
```

**Fonte de dados:** Já existe `home-showcase.controller.ts` no backend com dados mock de destinos. Usar esses dados reais ou expandir com Travelpayouts (já integrado).

#### Gamificação: Nível de Viajante

```
┌──────────────────────────────────┐
│  ✈️ Viajante Iniciante           │
│  ████░░░░░░░░░░░░ Nível 2       │
│                                   │
│  🏆 Conquistas:                   │
│  [✓ Primeira Viagem]             │
│  [✓ Checklist 100%]             │
│  [○ Orçamento Master]           │
│  [○ Viajante Frequente]         │
│                                   │
│  Próxima conquista:               │
│  "Planejador Pro" — Complete o    │
│  planejamento guiado completo     │
└──────────────────────────────────┘
```

**Conquistas propostas (sem backend complexo — baseado em dados já existentes):**

| Badge | Condição | Dado existente |
|-------|----------|---------------|
| Primeira Viagem | Criar 1 viagem | trips.length >= 1 |
| Roteiro Montado | Adicionar 5+ itens ao roteiro | itineraryItems.length >= 5 |
| Checklist Master | Completar 100% do checklist | checklist completion |
| Orçamento Controlado | Marcar todos os itens como pagos | payment progress 100% |
| Explorador | Planejar viagens para 3+ destinos | unique destinations >= 3 |
| Viajante Social | Convidar 1 colaborador | collaborators.length >= 1 |
| Caçador de Ofertas | Criar 3+ alertas de preço | priceAlerts.length >= 3 |
| Globetrotter | Planejar viagem internacional | trip.destination fora do Brasil |
| Viagem Perfeita | Score de readiness 100% | readiness === 100 |
| Veterano | Completar 5 viagens | completed trips >= 5 |

**Implementação:** Tudo calculável no frontend com dados que já existem. Não precisa de tabela nova no banco. Armazenar badges desbloqueados em um campo JSON no User ou calcular on-the-fly.

---

## 4. REDESIGN DA VISÃO GERAL DA VIAGEM (Dashboard)

### Problema Atual
O score numérico "85" é abstrato. Os 4 cards de métricas são informativos mas não acionáveis. O "Planejamento Guiado" está perdido no final da página.

### Nova Estrutura

#### Hero (mantém, aprimora)
```
┌─────────────────────────────────────────────────────────┐
│  [Foto do destino com gradiente]                         │
│                                                           │
│  LISBOA, PORTUGAL 🇵🇹                                    │
│  12 — 19 de Julho · 7 noites · 2 viajantes              │
│                                                           │
│  ┌────────┐  ┌────────────┐  ┌──────────┐               │
│  │ 23 dias│  │ ☀️ 24°C    │  │ €1=R$5.92│               │
│  │ faltam │  │ Lisboa, Jul │  │ câmbio   │               │
│  └────────┘  └────────────┘  └──────────┘               │
│                                                           │
│  [Editar] [Compartilhar] [Iniciar Viagem]               │
└─────────────────────────────────────────────────────────┘
```

**Novo: Widgets de clima e câmbio**
- Clima: API gratuita Open-Meteo (sem key necessária). Mostrar ícone + temperatura média para o mês da viagem.
- Câmbio: Usar a CurrencyService já existente. Mostrar conversão da moeda da viagem para BRL.

#### Substituir Score Numérico → Checklist Visual de Progresso

Em vez de "85%", mostrar uma **jornada visual com etapas**:

```
Sua viagem está quase pronta!

✅ Destino definido          
✅ Datas confirmadas         
✅ Voos reservados            
⬜ Hospedagem                 ← "Buscar hotéis em Lisboa"
✅ Roteiro montado            
⬜ Orçamento revisado         ← "Revisar orçamento"
✅ Checklist em dia           

━━━━━━━━━━━━━━━━━━━━━ 71% pronta

[5 de 7 etapas completas]
```

**Cada item incompleto tem um link direto** para a ação. O usuário nunca se pergunta "o que falta?".

**Dados:** O código atual já calcula readiness items em `trip-dashboard.component.ts` (lista `missingItems`). Apenas inverter a lógica: mostrar o que FOI feito + o que falta, em vez de só o que falta.

#### "Próximos 3 Passos" — Sempre Visível

```
┌─────────────────────────────────────────────┐
│  📋 Próximos passos                          │
│                                               │
│  1. 🏨 Reservar hospedagem                   │
│     Hotéis em Lisboa a partir de R$ 280/noite │
│     [Buscar hotéis →]                        │
│                                               │
│  2. 🎯 Adicionar atividades                  │
│     Top 5 em Lisboa: Torre de Belém, Pastéis │
│     de Belém, Alfama...                       │
│     [Ver atividades →]                       │
│                                               │
│  3. 💰 Revisar orçamento                     │
│     Estimativa atual: R$ 8.400               │
│     [Ver detalhes →]                         │
│                                               │
└─────────────────────────────────────────────┘
```

**Lógica:** Ordenar os `missingItems` atuais por impacto (voos > hospedagem > atividades > orçamento > checklist) e mostrar os 3 primeiros com contexto rico.

#### Cards de Métricas — Redesenho Acionável

**Antes:**
```
[Orçamento: R$ 8.400]  [Conflitos: 2]  [Checklist: 60%]  [Readiness: 85]
```

**Depois:**
```
┌──────────────────┐  ┌──────────────────┐
│ 💰 Orçamento     │  │ ⚠️ 2 Conflitos   │
│ R$ 8.400 total   │  │                   │
│ R$ 3.200 pago    │  │ Voo sobrepõe tour │
│ ██████░░░░ 38%   │  │ [Resolver agora →]│
│ [Ver detalhes →] │  │                   │
└──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│ ✅ Checklist     │  │ 📅 Próximo item   │
│ 12 de 20 feitos  │  │                   │
│ ██████████░░ 60% │  │ Check-in hotel    │
│ 🔴 2 atrasados!  │  │ 12 Jul, 14:00     │
│ [Ver lista →]    │  │ [Ver no roteiro →]│
└──────────────────┘  └──────────────────┘
```

**Mudanças-chave:**
- Cada card tem um **CTA clicável**
- Conflitos mostram **o que** está conflitando (não só o número)
- Checklist mostra **itens atrasados** em destaque
- "Próximo item" substitui o readiness score numérico frio

#### Dicas Locais do Destino

```
💡 Dicas para Lisboa

• Melhor época: Mai-Out (você vai em Jul ✅)  
• Fuso horário: GMT+1 (4h a frente de Brasília)
• Tomada: Tipo F (diferente do Brasil — leve adaptador!)
• Gorjeta: Não obrigatória, 5-10% em restaurantes
• Transporte: Lisboa Card dá metrô + atrações ilimitados

[Fonte: dados estáticos por destino, sem API externa]
```

**Implementação:** Criar um JSON estático com dicas para os 30-50 destinos mais populares entre brasileiros. Sem integração externa necessária.

---

## 5. CORREÇÃO DAS TELAS VAZIAS

### Princípio: Nenhuma tela jamais fica "vazia". Toda tela sem dados é uma oportunidade de engajar.

### 5.1 Hospedagem (antes da busca)

**Atual:** Formulário de busca + ilustração genérica "Busque a hospedagem ideal".

**Proposto:**
```
🏨 Hospedagem para Lisboa

[Formulário de busca pré-preenchido com destino e datas da viagem]

━━━━ Enquanto isso ━━━━

📍 Bairros populares em Lisboa
┌────────────┐ ┌────────────┐ ┌────────────┐
│ 📸 Alfama  │ │📸 Baixa-   │ │ 📸 Belém   │
│ Tradicional│ │Chiado      │ │ Cultural   │
│ €€         │ │ Centro     │ │ €€€        │
│            │ │ €€€        │ │            │
└────────────┘ └────────────┘ └────────────┘

💡 Dica: Para Lisboa em julho, reserve com antecedência.
   Alta temporada — preços sobem 30-40%.

🏷️ Faixa de preço típica: R$ 250 — R$ 600/noite
   (baseado em seu perfil: casal, conforto)

[Buscar hotéis em Lisboa →]
```

**Implementação:**
- Pré-preencher destino/datas da viagem ativa (dados já disponíveis via `TripStateService`)
- Dados de bairros: JSON estático para top 30 destinos
- Faixa de preço: Pode usar dados do Booking.com showcase (já existe `hotels-showcase.controller.ts`)

### 5.2 Atividades (antes da busca)

**Atual:** "Nenhuma atividade encontrada. Tente um destino diferente."

**Proposto:**
```
🎯 O que fazer em Lisboa

[Busca pré-preenchida: "Lisboa"]

━━━━ Atividades populares ━━━━

┌─────────────────┐ ┌─────────────────┐
│ 📸              │ │ 📸              │
│ 🏛️ Torre de     │ │ 🍰 Pastéis de   │
│ Belém           │ │ Belém           │
│ ⭐ 4.7 · Grátis │ │ ⭐ 4.9 · €€     │
│ Cultural        │ │ Gastronômico    │
└─────────────────┘ └─────────────────┘
┌─────────────────┐ ┌─────────────────┐
│ 📸              │ │ 📸              │
│ 🚃 Elétrico 28  │ │ 🌊 Sintra       │
│ ⭐ 4.5 · €€     │ │ ⭐ 4.8 · €€€    │
│ Transporte      │ │ Bate-volta      │
└─────────────────┘ └─────────────────┘

Categorias:
[🍽️ Gastronômico] [🏛️ Cultural] [🌿 Natureza]
[🎢 Aventura] [🛍️ Compras] [📸 Fotogênico]

💡 "Em Lisboa, separe pelo menos 1 dia inteiro para Sintra.
    Fica a 40 min de trem e vale cada minuto."
```

**Implementação:**
- JSON estático com top 5 atividades para os 30 destinos mais populares
- Categorias visuais com emoji (sem custo de API)
- "Dica de viajante" estática por destino
- Ao clicar em uma atividade sugerida, pré-preenche a busca ou abre dialog de adicionar manualmente

### 5.3 Carros (antes da busca)

**Atual:** Formulário de busca vazio.

**Proposto:**
```
🚗 Aluguel de carro para Lisboa

[Formulário pré-preenchido com local e datas]

━━━━ Você precisa de carro em Lisboa? ━━━━

┌─────────────────────────────────────────┐
│ 🚇 Lisboa tem ótimo transporte público  │
│                                          │
│ ✅ Metrô cobre toda a cidade            │
│ ✅ Uber disponível e barato             │
│ ✅ Trem para Sintra, Cascais            │
│                                          │
│ ⚠️ Considere carro apenas se:           │
│ • Vai explorar o Algarve (sul)          │
│ • Quer fazer rota pelo interior         │
│ • Viaja com crianças pequenas           │
│                                          │
│ 💰 Média: R$ 120-250/dia               │
└─────────────────────────────────────────┘

[Buscar carros mesmo assim →]
[Pular — não preciso de carro ✓]
```

**Implementação:**
- JSON estático: para cada destino popular, flag `needsCar: true/false` com razões
- "Pular" marca mentalmente para o usuário que ele já avaliou essa etapa (contribui para o readiness score)

---

## 6. SISTEMA DE ENGAJAMENTO E RETENÇÃO

### 6.1 Notificações (dentro do app + email)

**Gatilhos e mensagens:**

| Gatilho | Quando | Mensagem (email subject) | Canal |
|---------|--------|--------------------------|-------|
| Viagem criada sem itens | 24h após criar | "Sua viagem para {destino} está esperando ✈️" | Email |
| Preço de voo caiu | Imediato | "🔥 Voo para {destino} caiu R${valor}!" | Email + Push |
| 30 dias antes da viagem | D-30 | "Faltam 30 dias! {destino} está te esperando" | Email |
| 7 dias antes | D-7 | "Semana que vem você embarca! Checklist ok?" | Email |
| Checklist incompleto | D-14 | "3 itens do checklist precisam de atenção" | In-app |
| Colaborador adicionou item | Imediato | "{nome} adicionou Pastéis de Belém ao roteiro 🍰" | In-app |
| Viagem completada | D+1 após retorno | "Como foi {destino}? Conte para a gente!" | Email |
| Inatividade 14 dias | D+14 sem login | "Sua próxima aventura está esperando..." | Email |
| Badge desbloqueado | Imediato | "🏆 Nova conquista: Roteiro Montado!" | In-app |

**Implementação:**
- Notificações in-app: já existem (`notifications` module no backend)
- Email: Nodemailer já configurado. Criar templates HTML bonitos.
- Push: Não implementar agora. Focar em email + in-app.
- Backend: Criar um `engagement.service.ts` com cron jobs via `@nestjs/schedule` (já usado para price alerts)

### 6.2 Sistema de Conquistas / Badges

Usar a tabela da seção 3. Implementação leve:

```typescript
// Novo campo no model User (ou computed no frontend)
// badges: string[] no Prisma schema

// Frontend: BadgeService
// Calcula badges baseado nos dados existentes
// Compara com badges já desbloqueados
// Dispara notificação quando novo badge é detectado
```

**UI de badges:** Modal ou seção no perfil do usuário. Cada badge tem:
- Ícone (emoji ou SVG simples)
- Nome
- Descrição de como desbloquear
- Estado: desbloqueado (colorido) / bloqueado (cinza + dica)

### 6.3 Streak de Planejamento

**Conceito:** "Dia X de planejamento" — conta dias consecutivos que o usuário acessou/modificou algo na viagem.

```
🔥 3 dias planejando Lisboa!
   Continue amanhã para manter o streak.
```

**Implementação:**
- Armazenar `lastActiveDate` no localStorage (não precisa de backend)
- Calcular streak no frontend
- Mostrar na Home e no Dashboard da viagem
- Badge "Focado": manter streak de 7 dias

**Por que funciona:** Baixo custo de implementação, alto impacto psicológico. Duolingo validou esse pattern.

### 6.4 Emails de Reengajamento

**Template base (HTML bonito com foto do destino):**

```
Subject: "Sua viagem para Lisboa está 71% pronta ✈️"

Oi {nome}!

Faz {X} dias que você não mexeu no seu roteiro para Lisboa.

Aqui está o que falta:
🏨 Reservar hospedagem
🎯 Adicionar atividades
💰 Revisar orçamento

[Continuar planejando →]

💡 Enquanto isso, voos para Lisboa estão R$ 2.890
   (R$ 400 mais barato que semana passada!)

—
Travelyx · Da ideia ao embarque.
```

**Frequência:** Máximo 2 emails/semana. Respeitar opt-out.

---

## 7. FEATURE NOVA: "MODO VIAGEM" (durante a viagem)

### Conceito
Quando a data da viagem chega, a interface muda automaticamente. Sai o modo "planejamento" (denso, muitas opções) e entra o modo "viagem" (limpo, prático, imediato).

### Ativação
- **Automática:** Quando `Date.now()` está entre `trip.dateStart` e `trip.dateEnd`
- **Manual:** Botão "Iniciar Viagem" no dashboard (já existe!)
- **Visual:** Banner no topo: "🟢 Você está viajando! Modo viagem ativado."

### Interface do Modo Viagem

```
┌─────────────────────────────────────────┐
│  📍 Lisboa · Dia 3 de 7                  │
│  Terça, 14 de Julho                      │
│  ☀️ 26°C · Ensolarado                    │
└─────────────────────────────────────────┘

━━━━ Agora ━━━━

🏛️ Torre de Belém
   10:00 — 12:00
   📍 Av. Brasília, Lisboa
   [Abrir no Maps →]

━━━━ Próximo ━━━━

🍽️ Pastéis de Belém
   12:30 — 13:30
   📍 R. de Belém 84-92
   💰 ~€15 por pessoa
   [Abrir no Maps →]

━━━━ Depois ━━━━

🚃 Elétrico 28 até Alfama
   14:00 — 15:00

━━━━━━━━━━━━━━━━━━━━━

┌────────┐ ┌────────┐ ┌────────┐
│ 🏨     │ │ 🆘     │ │ 📋     │
│ Meu    │ │ Emer-  │ │ Docs   │
│ Hotel  │ │ gência │ │        │
└────────┘ └────────┘ └────────┘
```

**Ações rápidas fixas no bottom:**
- **Meu Hotel:** Nome, endereço, telefone, link Maps. Uma toque pra ligar ou navegar.
- **Emergência:** Número de emergência do país (JSON estático: Brasil 190/192, Portugal 112, etc.) + endereço da embaixada brasileira + contato do seguro viagem (se cadastrado em Documentos)
- **Documentos:** Acesso rápido a passaporte, reservas, boarding pass

### Diferenciação Visual
- **Modo Planejamento:** Sidebar completa, muitas seções, cor coral dominante, layout denso
- **Modo Viagem:** Sem sidebar. Uma coluna só. Fundo branco. Tipografia grande. Cards com alto contraste. Bottom bar com 3-4 ações essenciais. Foco em "o que fazer AGORA".

**Implementação:**
- O componente `active-trip` já existe em `features/active-trip/`! Só precisa ser redesenhado com essa visão.
- Dados: todos já existem no `TripStateService`
- Adicionar: JSON estático com números de emergência por país

---

## 8. FEATURE NOVA: "COMUNIDADE TRAVELYX"

### Princípio: Social sem ser rede social. Útil, não voyeurístico.

### 8.1 Roteiros Públicos

**Já existe:** `publicSlug` no modelo Trip + rota `/v/:slug`. Só falta dar visibilidade.

```
Roteiros da Comunidade

🔍 [Buscar destino...]

Destinos populares:
[Lisboa] [Gramado] [Orlando] [Buenos Aires] [Santiago]

━━━━ Roteiros em destaque ━━━━

┌─────────────────────────────────────┐
│ 📸 Lisboa em 7 dias — por Ana M.   │
│ ⭐ 4.8 · 23 visualizações          │
│ 7 dias · €1.200/pessoa · Casal     │
│ Inclui: 3 voos, 1 hotel, 12 ativs  │
│ [Ver roteiro →] [Copiar para mim →]│
└─────────────────────────────────────┘
```

**"Copiar para mim"** = Clone da trip (feature já implementada!) com os dados do roteiro público. O usuário ganha um roteiro completo em 1 clique.

### 8.2 Social Proof Contextual

Em vez de uma seção separada "comunidade", inserir social proof onde faz sentido:

- **Na busca de destino:** "12 pessoas planejaram Lisboa este mês no Travelyx"
- **No hotel:** "Hotel mais adicionado por viajantes Travelyx em Lisboa"
- **Na atividade:** "95% dos viajantes que foram a Lisboa visitaram a Torre de Belém"

**Implementação:** Contadores simples no backend. Query count por destino/item. Dados anonimizados.

### 8.3 Privacidade

- **Padrão:** Toda viagem é privada
- **Opt-in:** Usuário escolhe tornar pública (toggle já existe no share dialog)
- **Anonimização:** Mostrar apenas primeiro nome + inicial. "Ana M."
- **Dados pessoais:** Nunca expostos. Só itinerário, destino, categorias.

---

## 9. MELHORIAS TÉCNICAS DE UX PRIORITÁRIAS

### Top 10 — Ordenadas por Impacto / Esforço

| # | Problema | Solução | Impacto | Esforço |
|---|----------|---------|---------|---------|
| 1 | **Sidebar com 13 itens** intimida novos usuários | Colapsar em 5 itens principais: Viagens, Roteiro, Orçamento, Checklist, Alertas. Sub-itens aparecem só dentro do contexto de viagem. "Explorar" (voos/hotéis/carros) vira menu dentro do Roteiro. | 🔴 Alto | 🟢 Baixo |
| 2 | **Empty states mortas** não engajam | Implementar empty states ricos com sugestões contextuais (seção 5) | 🔴 Alto | 🟡 Médio |
| 3 | **Sem onboarding** → usuário perdido | Implementar fluxo de 4 telas (seção 2) | 🔴 Alto | 🟡 Médio |
| 4 | **Score numérico não acionável** | Substituir por checklist visual com links diretos (seção 4) | 🔴 Alto | 🟢 Baixo |
| 5 | **Formulários não pré-preenchidos** | Auto-preencher destino + datas da viagem em todas as buscas | 🟠 Alto | 🟢 Baixo |
| 6 | **"Planejamento Guiado" escondido** | Promover como CTA principal no dashboard para viagens < 50% prontas. Card grande, colorido, no topo. | 🟠 Alto | 🟢 Baixo |
| 7 | **Conflitos sem resolução** | No card de conflito, mostrar exatamente o que conflita + botão "Resolver" que abre a timeline no ponto certo | 🟡 Médio | 🟢 Baixo |
| 8 | **Mobile: sidebar não explorada** | Redesenhar bottom nav com as 4 ações mais usadas: Home, Roteiro, Orçamento, Mais. Sidebar só em desktop. | 🟠 Alto | 🟡 Médio |
| 9 | **Copy genérico em toda a UI** | Aplicar nova copy (seção 12) em todos os textos | 🟡 Médio | 🟢 Baixo |
| 10 | **Sem feedback visual de progresso** | Adicionar micro-animações: confetti ao completar checklist, progress bar animada, toasts celebratórios | 🟡 Médio | 🟢 Baixo |

---

## 10. ROADMAP DE 90 DIAS

### Sprint 1: Quick Wins (Dias 1-30)
**Tema: "Fazer o básico brilhar"**

| Semana | Tarefa | Impacto |
|--------|--------|---------|
| 1 | Simplificar sidebar (5 itens, contextual) | Remove intimidação |
| 1 | Pré-preencher formulários com dados da viagem | Remove fricção |
| 1 | Promover "Planejamento Guiado" como CTA principal | Guia novos usuários |
| 2 | Substituir score numérico por checklist visual acionável | Clareza de próximos passos |
| 2 | Reescrever toda a copy (pt.json + en.json) | Emoção e personalidade |
| 2 | Cards de conflito com resolução rápida | Menos frustração |
| 3 | Empty states ricos para Hospedagem, Atividades, Carros | Engajamento em telas mortas |
| 3 | Contagem regressiva + clima + câmbio no dashboard | Emoção e utilidade |
| 4 | Micro-animações (confetti, progress bar, toasts) | Dopamina visual |
| 4 | JSON estático de dicas por destino (50 destinos) | Conteúdo útil sem API |

**Resultado Sprint 1:** Produto que parece vivo, guia o usuário, e emociona.

### Sprint 2: Engajamento (Dias 31-60)
**Tema: "Dar motivos para voltar"**

| Semana | Tarefa | Impacto |
|--------|--------|---------|
| 5 | Fluxo de onboarding (4 telas) | Ativação de novos usuários |
| 5 | Sistema de badges/conquistas (frontend) | Gamificação |
| 6 | Streak de planejamento | Hábito de retorno |
| 6 | Emails transacionais bonitos (templates HTML) | Reengajamento |
| 7 | Notificações de engajamento (cron jobs backend) | Retorno automático |
| 7 | Redesign da Home "Minhas Viagens" (3 blocos) | Inspiração ao abrir |
| 8 | Modo Viagem redesenhado (active-trip) | Uso durante a viagem |
| 8 | Botão de emergência + dados locais por país | Utilidade real |

**Resultado Sprint 2:** Usuários voltam por conta própria. Engajamento D7 sobe.

### Sprint 3: Crescimento (Dias 61-90)
**Tema: "Fazer os outros quererem usar"**

| Semana | Tarefa | Impacto |
|--------|--------|---------|
| 9 | Roteiros públicos da comunidade | Conteúdo gerado por usuários |
| 9 | "Copiar roteiro" em 1 clique | Onboarding com conteúdo pronto |
| 10 | Social proof contextual (contadores) | Prova social |
| 10 | Seção "Destinos em Alta" na Home | Inspiração + SEO |
| 11 | Share melhorado: card bonito para WhatsApp/Instagram | Viralidade orgânica |
| 11 | Landing page atualizada com nova copy + depoimentos | Conversão |
| 12 | Nível de viajante público no perfil | Competição saudável |
| 12 | Programa "Convide e ganhe" (badge especial) | Referral loop |

**Resultado Sprint 3:** Crescimento orgânico via compartilhamento e conteúdo.

---

## 11. MÉTRICAS DE SUCESSO

### Métricas de Ativação
| Métrica | Atual (estimado) | Meta 90 dias |
|---------|-------------------|--------------|
| % usuários que criam 1ª viagem em D0 | ~40% | 75% |
| % que adicionam 1+ item ao roteiro em D0 | ~15% | 50% |
| Tempo até 1º item adicionado | desconhecido | < 3 min |
| % que completam onboarding | N/A | 70% |

### Métricas de Retenção
| Métrica | Atual (estimado) | Meta 90 dias |
|---------|-------------------|--------------|
| Retenção D1 (volta no dia seguinte) | ~5% | 25% |
| Retenção D7 | ~2% | 15% |
| Retenção D30 | ~0% | 8% |
| Sessões por semana (usuários ativos) | ~1 | 3+ |

### Métricas de Engajamento
| Métrica | Atual (estimado) | Meta 90 dias |
|---------|-------------------|--------------|
| Itens médios por viagem | ~3 | 10+ |
| % viagens com readiness > 70% | ~10% | 40% |
| % viagens compartilhadas | ~5% | 20% |
| Colaboradores convidados por viagem | ~0.1 | 0.5 |
| Badges desbloqueados por usuário | N/A | 3+ |

### Métricas de Crescimento
| Métrica | Atual | Meta 90 dias |
|---------|-------|--------------|
| Cadastros por mês | ~3-5 | 30+ |
| Viagens públicas disponíveis | 0 | 20+ |
| NPS (Net Promoter Score) | desconhecido | 40+ |
| Convites enviados por mês | ~1 | 15+ |

### Como Medir
- **Ativação/Retenção:** Analytics com eventos customizados (adicionar tracking de eventos via `ActivityService` existente ou Google Analytics)
- **Engajamento:** Queries no banco existente (trips, itinerary_items, collaborators)
- **NPS:** Popup in-app simples após 2ª viagem completada
- **Crescimento:** Contagem de users + trips via admin panel (já existe)

---

## 12. COPY MELHORADO

### 12.1 Headlines e Taglines

| Local | Atual | Novo |
|-------|-------|------|
| Hero landing | "Pare de planejar viagem em 20 abas diferentes" | **"Sua próxima viagem merece mais que uma planilha."** |
| Subtítulo | "Voos, hotéis, roteiro dia a dia..." | **"Pesquise voos, monte o roteiro perfeito, divida custos com seus amigos e embarque sem surpresas. Tudo grátis."** |
| Home logada | "Planeje e organize suas próximas aventuras" | **"Suas viagens"** (clean, sem subtitle genérico) |
| Dashboard | "Preparação da Viagem" | **"Como está seu plano?"** |

### 12.2 CTAs (Call to Actions)

| Local | Atual | Novo |
|-------|-------|------|
| Criar viagem | "Nova viagem" | **"Planejar nova viagem ✈️"** |
| Buscar voos | "Buscar Voos" | **"Encontrar voos →"** |
| Buscar hotéis | "Buscar" | **"Ver hotéis em {destino} →"** |
| Planejamento guiado | "Começar" | **"Montar meu roteiro passo a passo"** |
| Compartilhar | "Compartilhar" | **"Convidar para planejar junto"** |
| Viagem vazia | "Comece a planejar sua viagem!" | **"Sua viagem para {destino} está esperando. Por onde quer começar?"** |
| Landing CTA | "Montar meu roteiro" | **"Começar a planejar — é grátis"** |

### 12.3 Empty States

| Tela | Atual | Novo |
|------|-------|------|
| Sem viagens | "Sua próxima aventura começa aqui" | **"Nenhuma viagem ainda — mas a gente sabe que você já tá pensando em algum lugar. 😏 Qual vai ser?"** |
| Sem voos | "Nenhum voo encontrado. Tente outras datas." | **"Nenhum voo encontrado pra essas datas. Tenta flexibilizar 1-2 dias — às vezes a diferença é enorme."** |
| Sem hotéis | "Nenhuma hospedagem encontrada." | **"Não achamos hotéis com esses filtros. Que tal ampliar as datas ou tentar outro bairro?"** |
| Sem atividades | "Nenhuma atividade encontrada." | **"Hm, sem atividades listadas para esse destino. Mas você pode adicionar manualmente — às vezes as melhores dicas vêm de quem já foi."** |
| Checklist vazio | "Checklist vazio" | **"Seu checklist vai aparecer automaticamente quando você adicionar voos, hotéis ou atividades ao roteiro. É tipo mágica, mas com organização."** |
| Orçamento vazio | "Sem dados de orçamento" | **"Quando você adicionar itens ao roteiro, o orçamento se monta sozinho. Zero planilha."** |
| Documentos vazio | "Nenhum documento enviado" | **"Passaporte, reservas, seguro — tudo num lugar só. Chega de procurar email na fila do aeroporto."** |

### 12.4 Mensagens de Sucesso (celebratórias)

| Evento | Atual | Novo |
|--------|-------|------|
| Viagem criada | "Viagem criada com sucesso!" | **"🎉 {destino} tá no radar! Bora montar o roteiro?"** |
| Voo adicionado | "Voo adicionado ao roteiro" | **"✈️ Voo garantido! Mais um passo pro embarque."** |
| Hotel adicionado | "Hospedagem adicionada ao roteiro" | **"🏨 Tem onde dormir! Agora falta decidir o que fazer por lá."** |
| Checklist 100% | (nenhuma) | **"✅ Checklist completo! Pode embarcar tranquilo."** |
| Readiness 100% | (nenhuma) | **"🚀 Viagem 100% planejada! Só falta a hora de ir."** |
| Primeiro badge | (não existe) | **"🏆 Conquista desbloqueada: {badge}! Você tá evoluindo."** |

### 12.5 Mensagens de Erro (humanas)

| Evento | Atual | Novo |
|--------|-------|------|
| Erro genérico | "Erro" | **"Ops, algo deu errado. Tenta de novo?"** |
| Sem internet | "Sem conexão com o servidor." | **"Parece que a internet caiu. Verifica sua conexão e tenta de novo."** |
| Rate limit | "Muitas buscas seguidas." | **"Calma, viajante! Muitas buscas de uma vez. Espera uns segundos e tenta de novo."** |
| Erro ao buscar | "Erro ao buscar voos." | **"Não conseguimos buscar voos agora. Pode ser temporário — tenta de novo em 1 minuto."** |

### 12.6 Microcopy de Interface

| Elemento | Atual | Novo |
|----------|-------|------|
| Subtitle hospedagem | "Hotéis, pousadas, apartamentos e mais" | **"De hostel a resort — encontre onde ficar em {destino}"** |
| Subtitle atividades | "Passeios, atrações e experiências" | **"O que fazer em {destino} — dos clássicos aos segredos locais"** |
| Subtitle roteiro | "Planeje cada dia da sua viagem" | **"Seu roteiro dia a dia — arraste, organize, viaje"** |
| Subtitle orçamento | "Controle financeiro completo" | **"Quanto vai custar? Acompanhe sem planilha"** |
| Subtitle checklist | "Preparativos automáticos" | **"Tudo que você precisa lembrar antes de embarcar"** |
| Subtitle documentos | "Organize passaportes, reservas..." | **"Passaporte, reserva, seguro — tudo num bolso digital"** |
| How it works step 1 | "Explore destinos" | **"Escolha o destino dos sonhos"** |
| How it works step 2 | "Monte seu roteiro" | **"Monte o plano perfeito"** |
| How it works step 3 | "Viaje tranquilo" | **"Embarque sem surpresas"** |

---

## APÊNDICE A: DADOS ESTÁTICOS NECESSÁRIOS

Para evitar integrações pagas, criar JSONs estáticos para:

1. **`destination-tips.json`** — 50 destinos populares entre brasileiros
   - Dicas locais (tomada, gorjeta, transporte, moeda, fuso)
   - `needsCar: boolean` com razão
   - Temperatura média por mês
   - Número de emergência
   - Endereço da embaixada brasileira (para internacionais)

2. **`destination-activities.json`** — Top 5 atividades por destino
   - Nome, categoria (emoji), faixa de preço, avaliação
   - Dica de viajante (1 frase)

3. **`destination-neighborhoods.json`** — Bairros populares por destino
   - Nome, perfil (€/€€/€€€), vibe (1 palavra)

4. **`emergency-numbers.json`** — Números de emergência por país
   - Polícia, ambulância, bombeiros, embaixada BR

Esses 4 arquivos são suficientes para eliminar TODAS as telas vazias e adicionar conteúdo útil sem nenhuma API externa paga.

---

## APÊNDICE B: PRIORIZAÇÃO MoSCoW

### Must Have (Sprint 1)
- [ ] Sidebar simplificada
- [ ] Empty states ricos
- [ ] Checklist visual substituindo score numérico
- [ ] Copy reescrita
- [ ] Formulários pré-preenchidos
- [ ] Planejamento Guiado promovido

### Should Have (Sprint 2)
- [ ] Onboarding de 4 telas
- [ ] Sistema de badges
- [ ] Emails de engajamento
- [ ] Modo Viagem redesenhado
- [ ] Home com 3 blocos

### Could Have (Sprint 3)
- [ ] Roteiros públicos
- [ ] Social proof contextual
- [ ] Share para WhatsApp bonito
- [ ] Streak de planejamento
- [ ] Nível de viajante

### Won't Have (pós 90 dias)
- Integração Spotify
- Chat com IA para sugestões
- Booking direto (Travelyx como OTA)
- App nativo (PWA é suficiente por agora)

---

*Documento gerado em 01/04/2026. Baseado na análise completa do código-fonte do Travelyx (Angular 21 + NestJS 11 + PostgreSQL).*
