# FastBite - Backlog Tecnico Mapa e Tracking (v1)

Data: 2026-05-08  
Escopo: implementar tracking de entrega em tempo real para `Customer` e `Courier` no mobile e no web.

## 1. Objetivo

Entregar um fluxo semelhante a apps de delivery:

- Estafeta partilha localizacao em tempo real durante entrega ativa.
- Cliente acompanha estafeta num mapa com estado da encomenda, ETA e rota.
- Web e mobile consomem o mesmo contrato de eventos realtime.

## 2. Estado Atual (baseline)

- Mobile tem placeholders visuais para tracking/mapa:
  - `Frontend/mobile/src/features/mobileHub/screens/customer/ClientTrackingScreen.js`
  - `Frontend/mobile/src/features/mobileHub/screens/courier/CourierMapScreen.js`
- Web atual esta orientado ao staff de restaurante, sem area cliente/courier com mapa.
- Backend GraphQL ainda boilerplate (`User`), sem dominio de tracking exposto.
- Documentacao ja define canais/eventos corretos:
  - `order.{orderId}.tracking`
  - `COURIER_POSITION_UPDATED`

## 3. Arquitetura Alvo (MVP)

1. App do estafeta recolhe localizacao em foreground (intervalo 5-10s).
2. Backend valida permissao da entrega e persiste ultima posicao.
3. Backend publica evento `COURIER_POSITION_UPDATED` no canal `order.{orderId}.tracking`.
4. App cliente (mobile/web) subscreve canal e atualiza marcador/rota.
5. ETA e polyline sao atualizados sem refresh.

## 4. Stack Tecnologico Recomendado

### Mobile (Expo)

- `expo-location` para permissao e watch de localizacao.
- `expo-maps` para mapa nativo (Android Google Maps / iOS Apple Maps).

### Web

- MVP: `react-leaflet` + Leaflet.
- Alternativa futura (visual/performance): `maplibre-gl`.

### Realtime

- Laravel Reverb (WebSocket broker).
- `laravel-echo` + `pusher-js` no frontend.

### Rotas/ETA

- Provedor de direcoes (escolher 1):
  - Google Routes API (comercial/mais completo)
  - OSRM/OpenRouteService (open-source/freemium)

## 5. Backlog por Epico

## Epico A - Fundacao Backend Realtime

### A1. Setup broadcasting/reverb

- Instalar e configurar broadcasting no Laravel.
- Configurar variaveis `REVERB_*` + `VITE_REVERB_*`.
- Criar `config/reverb.php` e ajustes de `broadcasting.php`.

### A2. Canais privados e autorizacao

- Definir canais privados:
  - `customer.{customerId}.orders`
  - `courier.{courierId}.jobs`
  - `order.{orderId}.tracking`
- Regras:
  - Customer apenas pedidos seus.
  - Courier apenas entrega atribuida.
  - Staff apenas pedidos do restaurante.

### A3. Evento de tracking

- Criar evento broadcast `CourierPositionUpdated`.
- Payload minimo:
  - `eventId`
  - `orderId`
  - `deliveryId`
  - `courierId`
  - `lat`, `lng`
  - `heading`, `speed`, `accuracy`
  - `recordedAt`
  - `etaSeconds` (opcional no MVP inicial)

### A4. Persistencia e integridade

- Atualizar tabela `couriers` com ultima localizacao.
- Opcional recomendado: `courier_position_history`.
- Validacoes:
  - `delivery` ativa
  - `courier` dono da entrega
  - coordenadas validas
  - rate limit por estafeta

### A5. API/GraphQL de tracking

- Mutation (exemplo): `updateCourierLocation(input)`.
- Query (exemplo): `orderTracking(orderId)` com estado inicial + ultima localizacao.
- Idempotencia para evitar duplicacao de eventos.

## Epico B - Mobile Courier (envio de localizacao)

### B1. Permissoes e ciclo de vida

- Pedir permissao de localizacao ao iniciar entrega.
- Iniciar `watchPositionAsync` apenas em entrega ativa.
- Parar watch ao concluir/cancelar entrega.

### B2. Publicacao periodica

- Intervalo alvo: 5-10s.
- Enviar apenas quando:
  - deslocamento minimo atingido (ex: >15m), ou
  - tempo maximo sem update atingido.
- Retry com backoff curto em erro de rede.

### B3. UI do mapa estafeta

- Substituir mock em `CourierMapScreen`.
- Mostrar:
  - marcador pickup/dropoff
  - marcador da posicao atual
  - polyline da rota ativa
  - ETA + distancia restante

## Epico C - Mobile Customer (consumo realtime)

### C1. Subscricao realtime

- Subcrever `order.{orderId}.tracking` ao abrir tracking.
- Ouvir:
  - `COURIER_POSITION_UPDATED`
  - `ORDER_OUT_FOR_DELIVERY`
  - `ORDER_DELIVERED`

### C2. UI de tracking real

- Substituir mock em `ClientTrackingScreen`.
- Mostrar:
  - restaurante, cliente, estafeta
  - posicao atual do estafeta
  - timeline de eventos
  - ETA dinamico

### C3. Estados de erro

- Sem permissao do estafeta/localizacao indisponivel.
- Queda de socket (reconnect e estado "a reconectar").
- Pedido entregue/finalizado (encerrar subscription).

## Epico D - Web Customer Tracking

### D1. Nova area web cliente

- Criar shell/screen de cliente web (tracking de pedido ativo).
- Nao misturar com shell de restaurante.

### D2. Mapa web e realtime

- Integrar `react-leaflet` no ecran de tracking.
- Consumir mesmo canal `order.{orderId}.tracking`.
- Reutilizar contrato de evento do mobile.

### D3. Paridade funcional

- Mesmos estados principais do mobile:
  - preparing
  - out_for_delivery
  - delivered
- Exibir ETA, distancia e status da entrega.

## Epico E - Rota, ETA e Qualidade

### E1. Servico de direcoes

- Criar `RoutingService` no backend.
- Endpoint interno para obter:
  - polyline
  - distancia total/restante
  - ETA estimado

### E2. Politica de recalc

- Recalcular rota quando:
  - desvio > X metros
  - mudanca relevante de transito
  - pickup -> dropoff transition
- Evitar recalc a cada ping de GPS.

### E3. Observabilidade

- Metricas:
  - latencia media de evento
  - taxa de falha publish
  - reconnects por sessao
  - precisão media GPS
- Logs estruturados com `orderId`, `deliveryId`, `courierId`.

## 6. Contratos Minimos (MVP)

## Evento `COURIER_POSITION_UPDATED`

```json
{
  "eventId": "uuid",
  "eventName": "COURIER_POSITION_UPDATED",
  "orderId": "uuid",
  "deliveryId": "uuid",
  "courierId": "uuid",
  "lat": 41.1579,
  "lng": -8.6291,
  "heading": 122.4,
  "speed": 8.5,
  "accuracy": 9.2,
  "etaSeconds": 540,
  "recordedAt": "2026-05-08T12:30:15Z"
}
```

## Mutation `updateCourierLocation` (exemplo)

```graphql
mutation UpdateCourierLocation($input: UpdateCourierLocationInput!) {
  updateCourierLocation(input: $input) {
    ok
    deliveryId
    recordedAt
  }
}
```

Input esperado:

- `deliveryId`
- `lat`
- `lng`
- `heading` (opcional)
- `speed` (opcional)
- `accuracy` (opcional)
- `recordedAt`

## 7. Critérios de Aceitação (Definition of Done)

## Funcionais

- Cliente mobile ve posicao do estafeta em tempo real no mapa.
- Cliente web ve posicao do estafeta em tempo real no mapa.
- Estafeta envia posicoes apenas com entrega ativa.
- Evento chega aos clientes em < 2s na maioria dos casos.

## Seguranca e autorizacao

- Ninguem subscreve pedidos de outro utilizador.
- Estafeta nao atualiza entrega que nao lhe pertence.
- Canais privados protegidos por role + ownership.

## Operacionais

- Reconnect automatico funcional no frontend.
- Rate limit e deduplicacao ativos no backend.
- Logs e metricas minimas disponiveis.

## 8. Ordem de Implementacao Recomendada

1. Epico A (backend realtime minimo)
2. Epico B (courier publica localizacao)
3. Epico C (cliente mobile consome tracking real)
4. Epico D (cliente web tracking)
5. Epico E (ETA/rota/recalc + observabilidade)

## 9. Riscos e Mitigacoes

- Permissoes mobile/SDK mapa por plataforma.
  - Mitigar com checklist de permissao + teste em device real.
- Consumo de bateria do GPS.
  - Mitigar com throttling por distancia/tempo.
- Custos de API de rotas.
  - Mitigar com cache curto e recalc inteligente.
- Uso indevido de tiles OSM publicos em producao.
  - Mitigar com provider apropriado e politica de uso.

## 10. Entregaveis de Codigo Esperados

### Backend

- Canais e policies de autorizacao realtime.
- Evento `CourierPositionUpdated`.
- Mutation de update de localizacao.
- Query de estado inicial de tracking.

### Frontend Mobile

- `CourierMapScreen` com mapa real e envio de posicao.
- `ClientTrackingScreen` com subscricao realtime e mapa real.
- Servico `services/realtime/*` para websocket.

### Frontend Web

- Nova screen de tracking cliente com mapa.
- Integracao `laravel-echo` + canal `order.{orderId}.tracking`.

---

Notas finais:

- Este backlog esta alinhado com UC04/UC15 e com os canais/eventos definidos na documentacao tecnica atual.
- Fase 2 pode incluir tracking em background, push notifications avancadas e partilha de ETA para restaurante.

## Anexo A - Diagnostico Rapido (detalhado)

A base esta pronta para receber tracking real, mas ainda esta em fase mock:

- Mobile ja tem ecras de tracking/mapa como placeholder em:
  - `Frontend/mobile/src/features/mobileHub/screens/customer/ClientTrackingScreen.js` (linha 5)
  - `Frontend/mobile/src/features/mobileHub/screens/courier/CourierMapScreen.js` (linha 5)
- Web esta focado em staff de restaurante em:
  - `Frontend/web/src/screens/restaurant/RestaurantWebShell.jsx` (linha 7)
  - `Frontend/web/src/features/restaurant/views.js` (linha 5)
  - Nao existe ainda area web de cliente/courier com mapa.
- Backend ainda esta boilerplate no GraphQL:
  - `Backend/graphql/schema.graphql` (linha 5)
  - Tambem nao ha setup de broadcasting/reverb no codigo atual.
- A documentacao ja define os canais/eventos corretos:
  - `order.{orderId}.tracking`
  - `COURIER_POSITION_UPDATED`
  - Referencias:
    - `Documentacao/IA/blueprint_tecnico_v1.md` (linha 174)
    - `Documentacao/IA/diagramas/realtime_canais_autorizacao.puml` (linha 14)

## Anexo B - Abordagem MVP Solida

1. Mobile estafeta envia localizacao (foreground) a cada 5-10s com `expo-location`.
2. Backend recebe (`deliveryId`, `lat`, `lng`, `heading`, `speed`, `accuracy`, `recordedAt`), valida que o estafeta pertence a entrega e publica `COURIER_POSITION_UPDATED` em `order.{orderId}.tracking`.
3. Cliente mobile e cliente web subscrevem esse canal e atualizam marcador no mapa em tempo real.
4. Rota (polyline) vem de servico de direcoes (Google Routes / OSRM / ORS), e recalcula so quando necessario (nao a cada ping).

## Anexo C - Stack Recomendado (resumo)

- Mobile (Expo): `expo-maps` + `expo-location`.
- Web: `react-leaflet` (MVP mais simples) ou `maplibre-gl` (mais app-like).
- Realtime: Laravel Reverb + `laravel-echo` + `pusher-js`.
- Observacao importante: nao usar `tile.openstreetmap.org` em carga real de producao sem cumprir politica e/ou sem trocar para provider proprio.

## Anexo D - Ordem de Implementacao para nao bloquear

1. Backend realtime minimo (broadcast + canal privado + evento de posicao).
2. Mobile courier: publicar localizacao.
3. Mobile cliente: consumir posicao e renderizar mapa real.
4. Web cliente: nova shell/screen de tracking com o mesmo canal.
5. ETA + recalcular rota + fallback offline.

## Anexo E - Fontes Oficiais Usadas

- Expo Maps: https://docs.expo.dev/versions/v54.0.0/sdk/maps/
- Expo Location: https://docs.expo.dev/versions/latest/sdk/location/
- Laravel Reverb: https://laravel.com/docs/13.x/reverb
- Laravel Broadcasting / Echo + Pusher protocol: https://laravel.com/docs/10.x/broadcasting
- React Leaflet (v5 docs): https://react-leaflet.js.org/docs/start-installation
- MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/
- Leaflet Quick Start: https://leafletjs.com/examples/quick-start/
- OpenStreetMap Tile Usage Policy: https://operations.osmfoundation.org/policies/tiles/
- OSRM API docs: https://project-osrm.org/docs/v26.4.0/
- Web geolocation `watchPosition` (HTTPS/permissoes): https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition
