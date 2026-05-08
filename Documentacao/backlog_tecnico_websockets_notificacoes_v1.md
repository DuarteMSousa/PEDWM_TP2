# FastBite - Backlog Tecnico WebSockets e Notificacoes (v1)

Data: 2026-05-08  
Escopo: definir implementacao de realtime (WebSockets) e notificacoes para mobile e web.

## 1. Resposta curta: vais precisar de WebSockets?

Sim, para o vosso caso de uso vais precisar.

Motivo:

- Tracking em tempo real (posicao do estafeta).
- Mudancas de estado da encomenda sem refresh.
- Ofertas de entrega para estafeta com timeout.

Sem WebSocket, a alternativa seria polling frequente (mais latencia, mais carga e pior UX).

## 2. O que usar (bibliotecas e stack)

## Backend (Laravel)

- `Laravel Reverb` para servidor WebSocket.
- `Broadcasting` do Laravel para emitir eventos de dominio.
- `ShouldBroadcast` nos eventos relevantes.
- Opcional recomendado: `outbox_events` + worker para robustez.

## Frontend Web (React)

- `laravel-echo` para subscrever canais/eventos.
- `pusher-js` porque o Reverb usa protocolo compativel Pusher.

## Frontend Mobile (Expo / React Native)

- Tambem `laravel-echo` + cliente compativel Pusher.
- Para push notifications: `expo-notifications`.
- Para token de push: `Notifications.getExpoPushTokenAsync()` (ou FCM/APNs diretos).

## 3. Canais WebSocket recomendados

Alinhado com a documentacao ja existente:

- `customer.{customerId}.orders`
- `restaurant.{restaurantId}.orders`
- `courier.{courierId}.jobs`
- `order.{orderId}.tracking`

Regra critica:

- Canais privados com autorizacao por ownership e role.

## 4. Eventos realtime minimos (MVP)

## Pedidos

- `ORDER_CREATED`
- `ORDER_CONFIRMED`
- `ORDER_PREPARING`
- `ORDER_READY`
- `ORDER_OUT_FOR_DELIVERY`
- `ORDER_DELIVERED`
- `ORDER_CANCELLED`

## Entrega / tracking

- `ORDER_COURIER_ASSIGNED`
- `COURIER_POSITION_UPDATED`
- `ORDER_PICKED_UP`

## Estafeta (job offers)

- `JOB_OFFERED`
- `JOB_ACCEPTED`
- `JOB_EXPIRED`

## 5. Notificacoes: como dividir responsabilidades

## Realtime in-app (app aberta)

Canal: WebSocket  
Uso:

- Atualizar UI em segundos (status, tracking, ofertas).
- Nao depende do sistema de notificacoes do SO.

## Push notification (app em background/fechada)

Canal: Push (Expo/FCM/APNs)  
Uso:

- Alertar cliente/estafeta fora da app.
- Exemplo: "Estafeta a caminho", "Pedido entregue", "Nova oferta de entrega".

## In-app feed (historico)

Canal: tabela `notifications` no backend  
Uso:

- Centro de notificacoes dentro da app.
- Ler/nao lidas, timestamps, deep links.

## Email/SMS (fallback ou eventos criticos)

Canal: Notifications Laravel (mail/sms provider)  
Uso:

- Falhas criticas ou utilizador offline por periodo longo.
- Confirmacao de pedido entregue, incidentes, etc.

## 6. Arquitetura recomendada (evento unico, multi-canal)

1. Dominio muda estado (ex: `ORDER_READY`).
2. Evento fica persistido (`order_events`) e/ou `outbox_events`.
3. Worker faz fan-out:
   - Broadcast WebSocket
   - Push notification
   - Registo em `notifications`
   - Email/SMS se regra exigir
4. Frontends recebem no canal adequado conforme estado da app.

Beneficio: uma unica origem de verdade para notificacao multi-canal.

## 7. Backlog por Epico

## Epico A - Setup Realtime base

- Instalar/configurar Reverb no backend.
- Configurar `broadcasting.php` e envs `REVERB_*`.
- Criar canais privados e regras de autorizacao.
- Preparar `laravel-echo` + `pusher-js` no web.
- Preparar cliente equivalente no mobile.

Definition of Done:

- Web e mobile ligam ao socket e recebem evento de teste.

## Epico B - Eventos de negocio em realtime

- Implementar eventos `ORDER_*`, `JOB_*`, `COURIER_POSITION_UPDATED`.
- Publicar no canal correto por actor.
- Garantir payload padrao (ids, timestamps, actor, data).

Definition of Done:

- Mudanca de estado no backend aparece em UI sem refresh.

## Epico C - Notificacoes push (mobile)

- Integrar `expo-notifications`.
- Pedir permissao e registar token de push por user/device.
- Criar servico backend para enviar push.
- Definir payloads com deep link para ecras.

Definition of Done:

- App em background recebe push e abre no ecran correto ao toque.

## Epico D - Centro de notificacoes in-app

- Persistir notificacoes em tabela `notifications`.
- Criar API de listagem (`nao lidas`, `historico`, `marcar como lida`).
- Criar ecran de inbox no mobile/web.

Definition of Done:

- Utilizador consulta historico e estado lida/nao lida.

## Epico E - Confiabilidade e observabilidade

- Retries e dead-letter logico para push/broadcast falhados.
- Idempotencia para evitar notificacoes duplicadas.
- Metricas:
  - latencia de entrega realtime
  - taxa de push entregue/erro
  - reconnects de socket
  - backlog da outbox

Definition of Done:

- Falhas temporarias recuperam sem perder eventos criticos.

## 8. Contratos minimos

## Envelope padrao de evento

```json
{
  "eventId": "uuid",
  "eventName": "ORDER_READY",
  "aggregateType": "order",
  "aggregateId": "order_uuid",
  "occurredAt": "2026-05-08T15:00:00Z",
  "actorId": "user_uuid",
  "data": {}
}
```

## Notificacao persistida (in-app)

Campos minimos:

- `id`
- `user_id`
- `type`
- `title`
- `message`
- `data_json` (deep link / metadados)
- `sent_at`
- `read_at`

## 9. Regras de produto importantes

- Se app esta em foreground: priorizar atualizacao realtime in-app, evitar spam de push.
- Se app esta em background: enviar push para eventos criticos.
- Para `JOB_OFFERED`, push deve ser imediato e com expiracao clara.
- Rate limit por utilizador para nao sobrecarregar.

## 10. Ordem de implementacao sugerida

1. Reverb + canais privados + Echo (base tecnica)
2. Eventos realtime core (`ORDER_*`, `JOB_*`, `COURIER_POSITION_UPDATED`)
3. Push notifications no mobile (`expo-notifications`)
4. Inbox in-app (`notifications`)
5. Retries, metricas e hardening

## 11. Riscos e mitigacoes

- Ligacao socket instavel em rede movel.
  - Mitigar com reconnect automatico e estado visual de reconexao.
- Duplicacao de notificacoes (realtime + push).
  - Mitigar com regras por estado da app + dedupe por `eventId`.
- Push nao entregue (permissoes negadas/token invalido).
  - Mitigar com fallback in-app e limpeza de tokens invalidos.
- Escalabilidade do broadcast.
  - Mitigar com outbox, queues e monitorizacao de throughput.

## 12. Entregaveis esperados

### Backend

- Config Reverb/Broadcast.
- Canais autorizados.
- Eventos broadcast de negocio.
- Servico de envio push.
- Persistencia de notificacoes.

### Frontend Web

- Cliente Echo configurado.
- Subscricao por role/canal.
- UI de atualizacao em tempo real.

### Frontend Mobile

- Cliente realtime configurado.
- Registro de push token.
- Handlers de notificacao recebida e click.
- Navegacao por deep link de notificacao.

## 13. Fontes oficiais (implementacao)

- Laravel Reverb: https://laravel.com/docs/13.x/reverb
- Laravel Broadcasting + Echo + pusher-js: https://laravel.com/docs/10.x/broadcasting
- Expo notifications overview: https://docs.expo.dev/push-notifications/what-you-need-to-know/
- Expo notifications SDK: https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo push setup: https://docs.expo.dev/push-notifications/push-notifications-setup
- Expo sending notifications: https://docs.expo.dev/push-notifications/sending-notifications/
- Pusher JS repo (compatibilidade e clientes): https://github.com/pusher/pusher-js
