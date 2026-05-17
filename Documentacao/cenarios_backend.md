# Cenarios Backend

## Cenarios unitarios

1. Pricing: normalizar quantidades invalidas para `1`.
2. Pricing: calcular total de item com opcoes e quantidade.
3. Pricing: aplicar descontos percentuais e fixos com limite ao valor base.
4. Pricing: total final nunca fica negativo.
5. Order items: encomenda fica `READY` apenas quando todos os items nao cancelados estao `READY`.
6. Order state machine: fluxo valido `PENDING -> CONFIRMED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED`.
7. Order state machine: impedir regressos e transicoes a partir de estados terminais.
8. Delivery state machine: fluxo valido `PENDING -> PICKED_UP -> IN_TRANSIT -> DELIVERED`.
9. Delivery state machine: permitir `FAILED` antes de estados terminais.
10. Delivery state machine: impedir regressos e transicoes a partir de `DELIVERED`/`FAILED`.
11. Notification mapper: converter `OrderEventType`/`DeliveryEventType`/`DeliveryOfferEventType` em `CreateNotificationDTO`.
12. Notification mapper: ignorar eventos sem notificacao associada.
13. Geo: calcular distancias e fallback route sem efeitos externos.
14. Routing: devolver rota vazia quando faltam coordenadas.
15. Routing: usar fallback quando OSRM esta desligado ou falha.
16. Routing: mapear resposta OSRM para pontos, distancia e duracao.

## Cenarios por service

### CartService

1. Criar/obter carrinho por cliente.
2. Adicionar produto disponivel.
3. Rejeitar produto indisponivel.
4. Rejeitar produto de restaurante diferente.
5. Rejeitar opcoes inexistentes ou de outro produto.
6. Rejeitar selecao abaixo de `min_options` ou acima de `max_options`.
7. Atualizar quantidade recalcula totais.
8. Remover item recalcula total.
9. Limpar carrinho deixa total a zero.

### OrderService

1. Checkout com `CASH` cria order confirmada, payment completo, items, snapshots, morada, eventos e notificacao.
2. Checkout eletronico cria order pendente, payment pendente e job de expiracao.
3. Checkout com cupao aplica desconto e incrementa `used_count`.
4. Checkout rejeita carrinho vazio.
5. Checkout rejeita morada fora do raio.
6. Cancelamento pelo cliente passa para `CANCELLED`.
7. Restaurante aceita e order passa para `PREPARING`.
8. Restaurante rejeita e order passa para `CANCELLED`.
9. Atualizacao de items passa order para `READY` quando todos nao cancelados estao prontos.
10. Transicoes invalidas sao rejeitadas pela state machine.

### PaymentService

1. Criar pagamento pendente.
2. `payPayment`/`confirmPayment` passa para `COMPLETED` e confirma a order.
3. `failPayment` passa para `FAILED` e cancela a order.
4. `cancelPayment` passa para `CANCELLED` e cancela a order.
5. Expiracao passa `PENDING` para `FAILED` com evento `PAYMENT_EXPIRED`.
6. Transicoes a partir de estados terminais sao rejeitadas.

### DeliveryService

1. Criar delivery pendente para order.
2. Oferecer delivery a estafeta cria `DeliveryOffer`, publica evento e agenda expiracao.
3. Aceitar oferta atribui courier, marca courier `BUSY`, expira outras ofertas e cria evento.
4. Rejeitar oferta cria evento e reabre procura de estafeta.
5. Marcar `PICKED_UP`, `IN_TRANSIT`, `DELIVERED` sincroniza order.
6. Marcar `FAILED` cria evento e notificacao.
7. Transicoes invalidas sao rejeitadas.

### TrackingService

1. Cliente consulta tracking do seu pedido.
2. Consulta de pedido de outro cliente e rejeitada.
3. Estafeta atualiza localizacao.
4. Atualizacao grava historico, atualiza courier e publica outbox/realtime.
5. Ultima posicao do estafeta e devolvida corretamente.

### NotificationService

1. Criar notificacao direta com `createAndDispatch`.
2. Criar notificacao a partir de evento via mapper.
3. Evento sem mapping nao cria notificacao.
4. Criacao de notificacao grava outbox `USER_NOTIFICATION_CREATED`.
5. Feed lista notificacoes e filtros de lidas/nao lidas.

### Restaurant/Menu/Campaign/Review/User Services

1. Criar, atualizar, apagar e listar entidades principais.
2. Validar ownership/escopo por `user_id`/`actor_user_id` quando aplicavel.
3. Validar dados obrigatorios e relacoes existentes.
4. Garantir que queries devolvem relacoes necessarias ao frontend.

## Cenarios de integracao GraphQL

1. Cliente cria carrinho e adiciona produto disponivel.
2. Carrinho rejeita produto indisponivel.
3. Carrinho rejeita produtos de restaurantes diferentes.
4. Carrinho rejeita opcoes que nao pertencem ao produto.
5. Carrinho rejeita selecao que viola `min_options`/`max_options`.
6. Checkout rejeita carrinho vazio.
7. Checkout rejeita pedido sem morada.
8. Checkout rejeita morada fora do raio de entrega.
9. Checkout com `CASH` cria `order CONFIRMED`, `payment COMPLETED`, eventos e notificacao.
10. Checkout com pagamento eletronico cria `order PENDING`, `payment PENDING` e agenda expiracao.
11. `payPayment`/`confirmPayment` marca pagamento como `COMPLETED` e confirma a encomenda.
12. Job de expiracao marca pagamento pendente expirado como `FAILED` e cancela a encomenda.
13. Restaurante aceita pedido e passa para `PREPARING`.
14. Restaurante rejeita pedido e passa para `CANCELLED`.
15. Items de cozinha ao ficarem todos prontos fazem a encomenda passar para `READY`.
16. Motor de estafetas cria oferta para estafeta `AVAILABLE`.
17. Estafeta aceita oferta, fica `BUSY` e a delivery ganha `courier_id`.
18. Oferta expirada tenta procurar outro estafeta.
19. Estafeta marca `PICKED_UP`, `IN_TRANSIT` e `DELIVERED`, sincronizando o estado da encomenda.
20. Tracking grava posicoes e publica evento realtime.
21. Notificacoes sao criadas para eventos importantes de order/delivery.

## Cenarios manuais/demo

1. Cliente abre restaurantes, escolhe menu, adiciona produto, faz checkout e acompanha tracking.
2. Restaurante ve pedido ativo, aceita, atualiza items e marca pronto.
3. Estafeta fica online, recebe oferta, aceita e completa entrega.
4. Web/mobile recebem eventos realtime via Reverb.
5. Queue processa outbox, notificacoes, expiracao de ofertas e expiracao de pagamentos.
