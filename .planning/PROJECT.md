# Triply

## What This Is

Triply é uma aplicação web de planejamento de viagens que centraliza buscas de voos, hospedagem, aluguel de carro, transporte entre cidades, passeios, experiências e pontos turísticos em um único lugar. O usuário busca, compara opções via APIs reais, e monta um roteiro personalizado dia-a-dia — tudo sem login e com persistência no localStorage. Ao invés de realizar transações, o app redireciona para fornecedores externos (modelo afiliado no futuro).

## Core Value

O usuário sai do zero ao roteiro completo em uma única sessão — buscando voos, hotel, passeios e atrações, adicionando tudo a um timeline organizado por dia e horário, sem criar conta.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Busca de voos com filtro direto/escala, origem, destino, datas e passageiros
- [ ] Busca de hospedagem por destino e datas com cards de preço e avaliação
- [ ] Busca de aluguel de carro por local e datas
- [ ] Busca de transporte entre cidades (ônibus/trem) com link externo
- [ ] Busca de passeios e experiências por destino
- [ ] Listagem de pontos turísticos por cidade com link oficial
- [ ] Adicionar qualquer item buscado ao roteiro com um clique
- [ ] Criar itens manuais personalizados no roteiro
- [ ] Roteiro organizado por dia e horário (editar, reordenar, remover)
- [ ] Persistência automática no localStorage e recuperação ao abrir o app
- [ ] UX limpa com Angular Material, loading states, empty states, erros visuais

### Out of Scope

- Autenticação / login — sem backend de usuários nesta versão
- Pagamento / checkout — apenas redirecionamento para fornecedores externos
- Drag and drop avançado no roteiro — reordenação simples é suficiente
- App mobile nativa — web responsivo é suficiente

## Context

- **Stack:** Angular 17+, Angular Material, arquitetura modular por feature
- **Persistência:** localStorage (sem backend de dados nesta versão)
- **APIs:** 6 integrações externas (voos, hospedagem, carro, transporte, passeios, atrações) via camada de abstração com mappers
- **Monetização futura:** estrutura preparada para afiliados — cada resultado linka para fornecedor externo
- **Sem autenticação** nesta versão

## Constraints

- **Tech Stack**: Angular 17+, Angular Material — definido pelo time
- **Autenticação**: Sem login — escopo deliberado para v1
- **Pagamento**: Fora do escopo — redirecionamento externo apenas
- **Backend**: Sem backend próprio em v1; APIs consumidas diretamente com camada de abstração preparada para proxy futuro

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Sem login em v1 | Reduz fricção, foco no planejamento rápido | — Pending |
| localStorage como persistência | Zero infra, suficiente para uso pessoal | — Pending |
| Camada de abstração para APIs | Permite trocar fornecedores sem refatorar UI | — Pending |
| Angular Material como Design System | Consistência visual rápida, componentes prontos | — Pending |
| Redirecionamento externo (sem checkout) | Prepara para modelo afiliado sem complexidade de pagamento | — Pending |

---
*Last updated: 2026-02-10 after initialization*
