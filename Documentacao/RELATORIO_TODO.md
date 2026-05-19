# Relatório PEDWM — Lista de Alterações

Baseado na revisão do `RelatórioPEDWMV2.pdf` (versão de 04/2026).

Ordem de prioridade: **Crítico → Importante → Menor**.

---

## CRÍTICO — sem isto o relatório fica inviável

### [ ] 1. Refazer **todos os diagramas** (são do projeto antigo de Sueca)

Os 4 diagramas atuais não pertencem ao FastBite — são de um jogo de cartas (Sueca/Flutter). Têm de ser substituídos integralmente.

- [ ] **Diagrama de Classes (Figura 1, pág. 15)** — substituir por diagrama com entidades reais: `User`, `Customer`, `Courier`, `Restaurant`, `Order`, `OrderItem`, `Cart`, `Product`, `Category`, `Delivery`, `DeliveryOffer`, `Payment`, `Address`, `OrderEvent`, `PaymentEvent`, `DeliveryEvent`. Fonte: `Backend/app/Models/`.
- [ ] **Diagrama ER (Figura 2, pág. 19)** — refazer a partir das migrations em `Backend/database/migrations/`. Schema atual mostra `rooms`, `games`, `events com game_id` — tudo errado.
- [ ] **Diagrama de Sequência (Figura 3, pág. 20)** — "Criar Sala e Entrada" com `Flutter LobbyPage` e `RoomService`. Substituir por:
  - Fluxo 1: Cliente cria encomenda (Cart → Checkout → Order → ORDER_CREATED → Payment → ORDER_CONFIRMED)
  - Fluxo 2: Restaurante aceita pedido (`startPreparingOrder` → Delivery criada → AssignCourierToDeliveryJob → DeliveryOffer)
  - Fluxo 3: Estafeta aceita oferta e atualiza estados (PICKED_UP → IN_TRANSIT → DELIVERED)
- [ ] **Diagrama de Comunicação em Tempo Real (Figura 4, pág. 21)** — EventType tem `PLAYER_JOINED`/`CARD_PLAYED`/`TRUMP_REVEALED`. Substituir pelos eventos reais: `ORDER_CREATED`, `ORDER_CONFIRMED`, `ORDER_PREPARING`, `ORDER_READY`, `DELIVERY_ASSIGNED`, `DELIVERY_PICKED_UP`, `DELIVERY_IN_TRANSIT`, `DELIVERY_DELIVERED`, `JOB_OFFERED`, etc. Mostrar os canais Reverb reais (`delivery.{id}`, `courier.jobs.{courierId}`, `restaurant.orders.{restaurantId}`).

### [ ] 2. Substituir **Figura 5** (pág. 24)

Caption diz "Demonstração da mesa de jogo" e mostra cartas em mesa verde. Substituir por **screenshots reais do FastBite**:

- [ ] Cliente: ecrã de tracking ("Acompanhar Pedido" com mapa Leaflet)
- [ ] Restaurante: queue de pedidos ou virtual kitchen
- [ ] Estafeta: tela de aceitação de oferta no mobile

### [ ] 3. Apagar texto "leftover" do projeto antigo

- [ ] **Capítulo 2, parágrafo de abertura (pág. 11)**, marcado a amarelo: *"Jogos multiplayer online representam um exemplo claro deste tipo de sistemas, uma vez que exigem sincronização contínua entre clientes, validação centralizada das regras do jogo…"* — apagar inteiro.

### [ ] 4. Preencher **Story Points reais** (pág. 25)

Atualmente:
```
• Alexandre Freitas – X story points
• Duarte Sousa – X story points
• Paulo Coelho – X story points
⚠️ (Aqui tens de meter os teus valores reais — isto é obrigatório no enunciado)
```
- [ ] Substituir os `X` pelos valores reais do Jira.
- [ ] Remover a linha de aviso a amarelo.

---

## IMPORTANTE — completam o trabalho

### [ ] 5. Adicionar secção sobre **Programação Orientada a Aspetos**

O enunciado exige POA e o código tem-na (`App\Aspects\Transactional` com `#[Transactional]` aplicado nos services), mas o relatório nunca a mostra concretamente.

- [ ] Em `4.2 Implementação do Backend`, criar subsecção **"4.2.x Programação Orientada a Aspetos"**.
- [ ] Mostrar exemplo: `OrderService::startPreparingOrder()` com `#[Transactional]` em [`Backend/app/Services/OrderService/OrderService.php:272`](../Backend/app/Services/OrderService/OrderService.php).
- [ ] Explicar como o aspect intercepta a chamada e envolve em DB transaction.

### [ ] 6. Adicionar secção sobre **Programação Funcional**

Outra promessa do cap. 1 que não está provada no relatório.

- [ ] Mostrar exemplos reais: helpers puros como , enums imutáveis (`OrderStatus`, `DeliveryStatus`, `PaymentStatus`), composição via `collection->filter->map->sortBy` no `AssignCourierToDeliveryJob`.

### [ ] 7. Adicionar secção sobre **Event Sourcing / Eventos de Domínio**

A arquitetura tem 3 tabelas de eventos (`order_events`, `payment_events`, `delivery_events`) que registam todas as transições — é uma decisão arquitetural forte que não está documentada.

- [ ] Explicar que cada transição gera uma row imutável no respetivo `*_events`.
- [ ] Mostrar como permite auditoria e reconstrução do estado.
- [ ] Distinguir entre *eventos de domínio persistidos* (DB) e *eventos broadcast* (Reverb / WebSocket).

### [ ] 8. Documentar o sistema **DeliveryOffer + AssignCourierToDeliveryJob**

É a parte tecnicamente mais interessante do projeto e não aparece em lado nenhum.

- [ ] Em `3.4 Diagramas de Sequência`, adicionar fluxo: `Order READY → AssignCourierToDeliveryJob → escolha por distância (GeoMath) → DeliveryOffer (TTL 30s) → JOB_OFFERED via Reverb → Courier accept/reject → retry até MAX_ASSIGNMENT_ATTEMPTS → fallback NO_COURIER_AVAILABLE`.
- [ ] Mostrar o algoritmo de seleção do estafeta mais próximo (`Courier::sortBy(distanceKm)`).

### [ ] 9. Refletir o State Pattern **concreto** (3.2.2.1, pág. 17)

Atualmente o relatório só descreve em abstrato. No código existe `App\Domain\StateMachines\Orders\OrderStateFactory`.

- [ ] Mostrar a classe e como ela define transições válidas (`CONFIRMED → PREPARING → READY → DISPATCHED → DELIVERED`).
- [ ] Referenciar a integração com `OrderService::transition()`.

### [ ] 10. Mover **Push Notifications** de "trabalho futuro" para "implementado"

Pág. 27 lista push notifications em trabalho futuro — mas estão implementadas!

- [ ] Remover de "5.2 Conclusão e trabalho futuro".
- [ ] Adicionar em `4.5 Implementação do Frontend` (mobile): tens `pushNotificationService.js`, mutation `RegisterPushToken`, integração Expo Notifications + FCM, deep linking via `Notifications.addNotificationResponseReceivedListener`.

### [ ] 11. Corrigir **numeração de secções** quebrada

- [ ] Pág. 24: "4.5 Implementação do Frontend" → tem como filhos "**4.6.1** Frontend Web" e "**4.6.2** Frontend Mobile" → devia ser **4.5.1** e **4.5.2**.
- [ ] A seguir vem "4.6 Validação e Testes" — colide com o erro acima. Renumerar.
- [ ] "1.2.6 Arquitetura Event-Driven" existe no texto (pág. 10) mas não está no índice (TOC).
- [ ] Regenerar a TOC do Word no final.

### [ ] 12. Corrigir **numeração de figuras**

- [ ] Lista de Figuras (pág. 6) salta: *Figura 2, 9, 10, 13, 14*. Renumerar tudo de 1 a N.
- [ ] Pág. 15 mostra "Figura 1 Diagrama de Classes" mas a Lista diz "Figura 2". Alinhar.

---

## MENOR — polimento final

### [ ] 13. Remover "Lista de Tabelas" (pág. 7)

Atualmente mostra: *"Não foi encontrada nenhuma entrada do índice de ilustrações."* Se não tens tabelas, remove a secção inteira em vez de mostrar a mensagem de erro do Word.

### [ ] 14. Adicionar **bibliografia / referências**

O documento cita "Facebook", "Laravel", "React", "Lighthouse", "Reverb" sem uma única referência.

- [ ] Criar secção de Referências no final (antes ou em vez dos Anexos vazios).
- [ ] Mínimo: docs oficiais de Laravel, GraphQL spec, Lighthouse, Reverb, React, React Native, Expo.

### [ ] 15. Preencher **Anexos** (pág. 28)

Atualmente só tem o título.

- [ ] Schema GraphQL (excerto representativo)
- [ ] Excerto da BD (output de `php artisan migrate:status` ou ER detalhado)
- [ ] Screenshots adicionais

### [ ] 16. Detalhar **4.6 Validação e Testes** (pág. 24-25)

Demasiado vago — apenas diz "foram realizados testes unitários e manuais".

- [ ] Listar suites de testes reais em `Backend/tests/`.
- [ ] Mostrar output de `php artisan test` (nº de testes, pass rate).
- [ ] Se houver, indicar cobertura.

### [ ] 17. Pequenos detalhes textuais

- [ ] Pág. 8: ponto solto antes do final do parágrafo de 1.1 — *"experiência fluida e responsiva para todos os utilizadores ."* (espaço extra antes do ponto).
- [ ] Pág. 11: bullet "Esta modelação permite representar o sistema… definidos na proposta ." — espaço antes do ponto.
- [ ] Uniformizar pontuação: alguns bullets terminam em `;`, outros em `.`, outros sem nada.
- [ ] "1.2.6 Arquitetura Event-Driven" não está no índice (já mencionado em #11, mas é um detalhe textual também).

---

## Resumo executivo

| Prioridade | Itens | Esforço estimado |
|---|---|---|
| Crítico | 1-4 | ~1 dia |
| Importante | 5-12 | ~1 dia |
| Menor | 13-17 | ~2-3 horas |

**Ordem recomendada de ataque:**

1. Apagar leftover do jogo (#3) — 5 minutos.
2. Story Points (#4) — 5 minutos.
3. Diagramas refeitos (#1) — bloco maior, faz-se em sessão dedicada.
4. Screenshots novos (#2) — capturar do projeto a correr.
5. Secções de POA / FP / Event Sourcing / DeliveryOffer (#5-#8) — escrita técnica nova.
6. Polimento (#11-#17).
