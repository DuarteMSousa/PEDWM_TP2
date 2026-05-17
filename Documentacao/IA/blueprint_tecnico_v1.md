# FastBite - Blueprint Tecnico v1

Data: 2026-05-05  
Escopo: consolidar regras tecnicas do MVP para implementacao sem ambiguidades.

## 1. Objetivo e Limites do MVP

### Objetivo
Entregar fluxo completo de encomenda em tempo real entre `Customer`, `Restaurant` e `Courier`, com estado consistente e auditavel.

### Inclui no MVP
- UC01 Explorar Restaurantes e Menus
- UC02 Gerir Carrinho
- UC03 Checkout
- UC04 Acompanhar Encomenda em Tempo Real
- UC08 Aceitar/Rejeitar Encomenda
- UC09 Selecao de estafeta
- UC10 Estado de disponibilidade do estafeta
- UC11 Aceitar pedido de entrega
- UC12 Marcar para recolha
- UC13 Atualizar estado da entrega
- UC14 Registo de eventos (auditoria)
- UC15 Notificacoes assicronas essenciais

### Fora do MVP (fase seguinte)
- Chat (UC16)
- Campanhas/cupoes completos (UC19)
- Repetir encomenda/historico/avaliacoes (UC18/UC20/UC21)

## 2. Modelo de Dados (v1 alinhado)

## Entidades base
- `users`: id, name, email, password_hash, role (`customer|courier|chain_manager|local_manager`), created_at
- `addresses`: id, label, street, city, state, postal_code, country, latitude, longitude
- `user_addresses`: id, user_id, address_id
- `restaurant_chains`: id, name
- `restaurants`: id, chain_id nullable, address_id, name, opening_hours, closing_hours, delivery_radius_km
- `categories`: id, chain_id nullable, restaurant_id nullable, name
- `products`: id, category_id, name, description
- `restaurant_products`: id, restaurant_id, product_id, local_price, is_available
- `carts`: id, customer_id(unique), total_amount
- `cart_items`: id, cart_id, restaurant_product_id, quantity, unit_price, total_price
- `orders`: id, customer_id, restaurant_id, delivery_address_id, status, total_amount, created_at
- `order_items`: id, order_id, restaurant_product_id, status, quantity, unit_price_snapshot, product_name_snapshot, total_price
- `payments`: id, order_id(unique), method, status, amount, transaction_id nullable, paid_at nullable, expired_at nullable
- `couriers`: id, user_id(unique), status, current_latitude nullable, current_longitude nullable, last_location_update nullable
- `deliveries`: id, order_id(unique), courier_id nullable, status, pickup_time nullable, delivery_time nullable, delivery_fee
- `order_events`: id, order_id, type, payload_json, created_at
- `payment_events`: id, payment_id, type, payload_json, created_at
- `notifications`: id, user_id, type, title, message, sent_at nullable, read_at nullable
- `outbox_events`: id, aggregate_type, aggregate_id, event_name, payload_json, status, retry_count, next_attempt_at

## Indices criticos
- `orders(status, created_at)`
- `deliveries(courier_id, status)`
- `couriers(status, last_location_update)`
- `order_events(order_id, created_at)`
- `outbox_events(status, next_attempt_at)`

## 3. Maquinas de Estado (regras fechadas)

## OrderStatus
Valores: `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`

Transicoes validas:
1. `PENDING -> CONFIRMED | CANCELLED`
2. `CONFIRMED -> PREPARING | CANCELLED`
3. `PREPARING -> READY | CANCELLED`
4. `READY -> OUT_FOR_DELIVERY`
5. `OUT_FOR_DELIVERY -> DELIVERED | CANCELLED`

Regras:
- Nao pode regressar a estados anteriores.
- `CANCELLED` e terminal.
- `DELIVERED` e terminal.

## OrderItemStatus
Valores: `PENDING`, `PREPARING`, `READY`, `CANCELLED`

Transicoes:
1. `PENDING -> PREPARING | CANCELLED`
2. `PREPARING -> READY | CANCELLED`

Regra de consistencia:
- `order.status = READY` apenas quando todos `order_items` estiverem `READY` ou `CANCELLED`.

## PaymentStatus
Valores: `PENDING`, `COMPLETED`, `FAILED`

Transicoes:
1. `PENDING -> COMPLETED | FAILED`

Regra:
- `order` so avanca para `CONFIRMED` apos `payment=COMPLETED` (exceto metodo `CASH`, onde confirma no checkout).

## DeliveryStatus
Valores: `PENDING`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`

Transicoes:
1. `PENDING -> PICKED_UP | FAILED`
2. `PICKED_UP -> IN_TRANSIT | FAILED`
3. `IN_TRANSIT -> DELIVERED | FAILED`

## 4. Fluxos Criticos

## Fluxo A: Checkout ate cozinha
1. Customer submete checkout.
2. Criar `order(PENDING)` + `payment(PENDING)` + `order_event(ORDER_CREATED)`.
3. Processar pagamento.
4. Se sucesso: `payment=COMPLETED`, `order=CONFIRMED`.
5. Publicar evento para canal do restaurante.
6. Restaurante aceita (`PREPARING`) ou rejeita (`CANCELLED`).

## Fluxo B: Atribuicao de estafeta
1. Em `order=CONFIRMED`, iniciar procura de `courier` com `status=AVAILABLE`.
2. Enviar oferta para estafeta com timeout de 30s.
3. Se aceitar: criar/atualizar `delivery(PENDING)` e ligar `courier_id`.
4. Se expirar: tentar proximo estafeta.
5. Sem estafetas apos N tentativas: cancelamento controlado do pedido.

## Fluxo C: Entrega
1. Restaurante marca pedido `READY`.
2. Estafeta marca `PICKED_UP` e `order=OUT_FOR_DELIVERY`.
3. Estafeta envia posicoes periodicas (5s-10s) com rate limit.
4. Estafeta marca `DELIVERED` e fecha `order=DELIVERED`.

## 5. Contratos de Eventos (Audit + Realtime)

## Order events (minimo MVP)
- `ORDER_CREATED`
- `ORDER_PAYMENT_COMPLETED`
- `ORDER_CONFIRMED`
- `ORDER_REJECTED`
- `ORDER_PREPARING`
- `ORDER_READY`
- `ORDER_COURIER_ASSIGNED`
- `ORDER_PICKED_UP`
- `ORDER_OUT_FOR_DELIVERY`
- `ORDER_DELIVERED`
- `ORDER_CANCELLED`

## Payment events (minimo MVP)
- `PAYMENT_CREATED`
- `PAYMENT_COMPLETED`
- `PAYMENT_FAILED`

## Payload padrao
```json
{
  "event_id": "uuid",
  "event_name": "ORDER_READY",
  "aggregate_type": "order",
  "aggregate_id": "order_uuid",
  "occurred_at": "2026-05-05T14:00:00Z",
  "actor_id": "user_uuid",
  "data": {}
}
```

## Regra tecnica
- Qualquer mudanca de estado deve gravar evento na mesma transacao da escrita principal.
- Publicacao WebSocket e notificacoes saem via `outbox_events` (evita perda de mensagem).

## 6. Canais WebSocket e Autorizacao

Tecnologia alvo: Laravel Reverb + broadcasting.

## Canais
- `customer.{customerId}.orders`: updates dos pedidos do cliente
- `restaurant.{restaurantId}.orders`: novas encomendas e progresso de cozinha
- `courier.{courierId}.jobs`: ofertas e estado das entregas
- `order.{orderId}.tracking`: tracking em tempo real

## Regras de acesso
- Customer: apenas canais do proprio `customerId` e pedidos seus.
- Restaurant staff: apenas `restaurantId` associado ao manager.
- Courier: apenas `courierId` proprio.
- Admin/manager: sem permissao global no MVP (somente escopo proprio).

## Eventos por canal (resumo)
- `customer.*`: ORDER_* + PAYMENT_*
- `restaurant.*`: ORDER_CREATED, ORDER_CONFIRMED, ORDER_REJECTED, ORDER_READY
- `courier.*`: JOB_OFFERED, JOB_ACCEPTED, JOB_EXPIRED, ORDER_PICKED_UP
- `order.*`: ORDER_PREPARING, ORDER_READY, ORDER_OUT_FOR_DELIVERY, COURIER_POSITION_UPDATED, ORDER_DELIVERED

## 7. API Surface (minima)

## REST/GraphQL comandos
- Criar carrinho/item, atualizar item, remover item
- Checkout (cria order + payment)
- Aceitar/rejeitar pedido (restaurante)
- Alternar disponibilidade estafeta
- Aceitar oferta de entrega
- Atualizar estado de entrega
- Enviar localizacao estafeta

## Queries
- Restaurantes e menus por area
- Estado detalhado de order
- Pedidos ativos por ator

## 8. Politicas de Erro e Confiabilidade

- Idempotencia fora do escopo do TP2: os comandos recebem `user_id`/`actor_user_id` no payload e nao exigem `Idempotency-Key`.
- Concurrency control com `lockForUpdate` em transicoes criticas.
- Retry exponencial para notificacoes/outbox (max 10 tentativas).
- Dead-letter logico quando excede retries.
- Timeout de oferta ao estafeta: 30 segundos.
- Timeout de pagamento pendente: 10 minutos (depois `FAILED`).

## 9. Backlog por Sprint (4 sprints)

## Sprint 1 - Fundacao e dominio
- Migrations das entidades core
- Seed minimo (1 chain, 2 restaurantes, 10 produtos)
- Auth base por role
- Carrinho + checkout inicial
- Escrita de `order_events`/`payment_events`

Definition of Done:
- checkout cria `order`, `payment`, eventos e retorna estado consistente

## Sprint 2 - Restaurante + Cozinha
- Painel restaurante (fila de pedidos)
- Aceitar/rejeitar pedido
- Atualizacao por item (`order_items`)
- Broadcast para cliente e restaurante

Definition of Done:
- cliente observa mudancas sem refresh

## Sprint 3 - Logistica estafeta
- Disponibilidade estafeta
- Motor de oferta com timeout
- Atribuicao de entrega
- Estados `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`
- Tracking de posicao

Definition of Done:
- pedido percorre ponta a ponta ate entregue

## Sprint 4 - Robustez e observabilidade
- Outbox worker + retries
- Notificacoes essenciais (push/email stub)
- Logs estruturados + metricas
- Testes de transicao e integracao realtime

Definition of Done:
- eventos sem perda em falha temporaria e com trilha de auditoria completa

## 10. Checklist de Alinhamento Antes de Codar

- Validar enum final em backend e frontend (mesmos valores)
- Fechar contrato de payload dos eventos
- Confirmar politica de cancelamento por falta de estafeta
- Confirmar endpoint interno para marcar pagamento como pago
- Fechar permissao de canais websocket por role

## 11. Estrutura recomendada no repositorio

- `Backend/`:
  - `app/Domain/*`
  - `app/Application/*`
  - `app/Infrastructure/Broadcasting/*`
  - `app/Jobs/Outbox/*`
  - `graphql/schema.graphql`
- `Frontend/web/src/`:
  - `features/orders/*`
  - `features/restaurants/*`
  - `services/realtime/*`
- `Frontend/mobile/src/`:
  - `features/tracking/*`
  - `features/courier/*`
  - `services/realtime/*`

## 12. Assuncoes usadas nesta v1

- Uso de GraphQL para query/mutation e WebSocket para subscriptions/eventos.
- `CASH` confirma no checkout; pagamentos eletronicos sao confirmados por endpoint interno (`payPayment`/`confirmPayment`).
- MVP sem multi-tenant complexo; escopo por restaurant/chain direto.
- Sem recomendacao de IA no MVP.

## 13. Diagramas de apoio

- `diagramas/arquitetura_mvp.puml`
- `diagramas/order_state_machine_mvp.puml`
- `diagramas/sequencia_checkout_realtime.puml`
- `diagramas/sequencia_atribuicao_estafeta.puml`
- `diagramas/realtime_canais_autorizacao.puml`

## 14. Mapeamento explicito aos objetivos da UC

Esta secao fecha o alinhamento com o enunciado: Programacao Funcional, Programacao Orientada a Aspetos e Event-Driven.

## 14.1 Programacao Funcional (PF)

Aplicacao pratica no projeto:
- Funcoes puras para calculo de totais, taxas e descontos no checkout.
- Funcoes puras para validacao de transicoes de estado (`canTransition(from, to)`).
- Transformacoes imutaveis de payloads de eventos antes de persistir/publicar.
- Uso de pipelines (`map/filter/reduce`) para agregacoes de `order_items`.

Regras de implementacao:
- Funcoes de dominio sem efeitos colaterais em `app/Domain/*`.
- Efeitos externos (DB, queue, websocket) apenas em camada de aplicacao/infra.

Evidencias esperadas no codigo:
- Modulo `OrderPricingPolicy` (calculo puro).
- Modulo `StateTransitionPolicy` (validacao pura).
- Testes unitarios deterministas para essas funcoes.

## 14.2 Programacao Orientada a Aspetos (AOP)

Aplicacao pratica no projeto:
- Cross-cutting de auditoria em mudancas criticas de estado.
- Cross-cutting de autorizacao por role/permissao.
- Cross-cutting de observabilidade (logs estruturados + metricas de latencia).
- Cross-cutting de validacao e logging para comandos sensiveis.

Implementacao sugerida no stack Laravel:
- `Middleware`/servicos para validacao de contexto, logging e tratamento de erros.
- `Observers`/`Listeners` para gerar trilha de auditoria.
- `Traits` ou `Action decorators` para instrumentacao de logs/metricas.
- `Policies/Gates` para autorizacao de recursos e canais websocket.

Evidencias esperadas no codigo:
- Interceptors AOP de transacao/logging/erro e validacoes nos servicos de dominio.
- Listener `RecordOrderStateChangeAudit`.
- Middleware/servico de logging com correlation id por request/evento.

## 14.3 Programacao Event-Driven

Aplicacao pratica no projeto:
- Eventos de dominio (`ORDER_*`, `PAYMENT_*`) como fonte de reatividade.
- `Outbox pattern` para garantir entrega confiavel de eventos.
- Publicacao para Reverb por worker assicrono.
- Consumo realtime no web/mobile por subscriptions/canais.

Regras de implementacao:
- Cada transicao de estado deve persistir evento na mesma transacao.
- Publicacao nunca direta da mutation/controlador; sempre por outbox worker.
- Retries com backoff e dead-letter logico para falhas persistentes.

Evidencias esperadas no codigo:
- Tabelas `order_events`, `payment_events`, `outbox_events`.
- Job `PublishOutboxEventJob`.
- Dash de monitorizacao basica: eventos publicados, retries, falhas.
