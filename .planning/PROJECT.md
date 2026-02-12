# Triply

## What This Is

Triply é uma aplicação web frontend-only de planejamento de viagens que centraliza buscas de voos, hospedagem, aluguel de carro, transporte entre cidades, passeios, experiências e pontos turísticos em um único lugar. O usuário busca, compara opções via APIs reais, e monta um roteiro personalizado dia-a-dia — tudo sem login e com persistência no localStorage. Ao invés de realizar transações, o app redireciona para fornecedores externos (modelo afiliado no futuro).

## Core Value

O usuário sai do zero ao roteiro completo em uma única sessão — buscando voos, hotel, passeios e atrações, adicionando tudo a um timeline organizado por dia e horário, sem criar conta.

## Requirements

### Validated

- ✓ Busca de voos com filtro direto/escala, origem, destino, datas e passageiros — v1.0
- ✓ Busca de hospedagem por destino e datas com cards de preço e avaliação — v1.0
- ✓ Busca de aluguel de carro por local e datas — v1.0
- ✓ Busca de transporte entre cidades (ônibus/trem) com link externo — v1.0
- ✓ Busca de passeios e experiências por destino — v1.0
- ✓ Listagem de pontos turísticos por cidade com link oficial — v1.0
- ✓ Adicionar qualquer item buscado ao roteiro com um clique — v1.0
- ✓ Criar itens manuais personalizados no roteiro — v1.0
- ✓ Roteiro organizado por dia e horário (editar, reordenar, remover) — v1.0
- ✓ Persistência automática no localStorage e recuperação ao abrir o app — v1.0
- ✓ UX limpa com Angular Material, loading states, empty states, erros visuais — v1.0

### Active

(None — next milestone requirements defined via `/gsd:new-milestone`)

### Out of Scope

- Autenticação / login — sem backend de usuários; localStorage + no-login é o diferencial
- Pagamento / checkout — apenas redirecionamento para fornecedores externos; PCI compliance fora de escopo
- Drag and drop avançado no roteiro — reordenação simples com botões up/down é suficiente para v1
- App mobile nativa — web responsivo com hamburger menu é suficiente
- AI trip generation — risco de alucinação, scope creep
- Offline PWA / service workers — localStorage já fornece persistência básica
- Real-time price updates — custos de polling, rate limits

## Context

Shipped v1.0 with 6,872 LOC across 73 source files (TypeScript + HTML + SCSS).

- **Stack:** Angular 21, Angular Material 21 (M3), standalone components, signals, SCSS with design tokens
- **State:** Signal-based TripStateService with effect() auto-persistence to localStorage
- **APIs:** 6 integrations — Amadeus (flights/OAuth2), Booking.com/RapidAPI (hotels, cars), hypothetical (transport), Viator (tours), OpenTripMap (attractions)
- **Architecture:** BaseApiService + Mapper pattern, functional interceptors (apiKey → error → loading), per-source error handling
- **Monetização futura:** cada resultado linka para fornecedor externo (affiliate-ready)
- **Build:** 428.86 kB initial + 623.83 kB lazy = 1.03 MB total, 0 errors, 0 warnings

## Constraints

- **Tech Stack**: Angular 21, Angular Material 21 — definido pelo time
- **Autenticação**: Sem login — escopo deliberado para v1
- **Pagamento**: Fora do escopo — redirecionamento externo apenas
- **Backend**: Sem backend próprio; APIs consumidas via dev proxy (proxy.conf.json), preparado para Cloudflare Worker futuro
- **API Keys**: Empty placeholders in environment files — never committed to version control

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Sem login em v1 | Reduz fricção, foco no planejamento rápido | ✓ Good — zero-friction UX achieved |
| localStorage como persistência | Zero infra, suficiente para uso pessoal | ✓ Good — auto-persist via effect(), survives refresh |
| Camada de abstração para APIs | Permite trocar fornecedores sem refatorar UI | ✓ Good — BaseApiService + Mapper cleanly separates concerns |
| Angular Material como Design System | Consistência visual rápida, componentes prontos | ✓ Good — M3 tokens + shared SCSS classes for consistency |
| Redirecionamento externo (sem checkout) | Prepara para modelo afiliado sem complexidade de pagamento | ✓ Good — all 6 categories have external links |
| Signal-based state (no NgRx) | Simplicidade, menos boilerplate, built-in Angular | ✓ Good — TripStateService with computed/effect covers all needs |
| Per-source error handling | Falha de uma API não bloqueia outras | ✓ Good — ErrorBannerComponent per-source, withFallback operator |
| CORS proxy mandatory | APIs bloqueiam CORS do browser | ✓ Good — proxy.conf.json for dev, ready for production proxy |

---
*Last updated: 2026-02-12 after v1.0 milestone*
