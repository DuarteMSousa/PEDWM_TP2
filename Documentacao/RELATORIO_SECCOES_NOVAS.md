# Secções novas / refinadas para o Relatório

Texto pronto a copiar para o Word. Cada secção indica **onde inserir** no relatório atual.

---

## A inserir em → **3.2.2.1 Padrão State** (substituir o que existe)

### 3.2.2.1 Padrão State

O padrão *State* foi aplicado de forma concreta na gestão do ciclo de vida das encomendas, encapsulando o comportamento de cada estado numa classe dedicada e centralizando as transições válidas num único ponto.

A implementação segue três peças:

- **`OrderState` (interface)** — define o contrato de cada estado: `status()`, `canTransitionTo(next)` e `transition(order, next)`.
- **`AbstractOrderState` (template method)** — implementa a lógica comum: verifica se o destino está na lista de transições permitidas e, se sim, atualiza o estado; caso contrário, lança uma `ValidationException`. Cada subclasse só tem de declarar `allowedTransitions()`.
- **`OrderStateFactory`** — selecciona dinamicamente a classe de estado a partir do enum `OrderStatus`:

```php
return match ($status) {
    OrderStatus::PENDING          => new PendingOrderState(),
    OrderStatus::CONFIRMED        => new ConfirmedOrderState(),
    OrderStatus::PREPARING        => new PreparingOrderState(),
    OrderStatus::READY            => new ReadyOrderState(),
    OrderStatus::OUT_FOR_DELIVERY => new OutForDeliveryOrderState(),
    OrderStatus::DELIVERED        => new DeliveredOrderState(),
    OrderStatus::CANCELLED        => new CancelledOrderState(),
};
```

Exemplo de transição permitida (em `PendingOrderState`):

```php
protected function allowedTransitions(): array
{
    return [OrderStatus::CONFIRMED, OrderStatus::CANCELLED];
}
```

Esta separação evita o anti-padrão de cadeias de `if/else` espalhadas pelos *services* e elimina, por construção, transições inválidas (ex.: passar de `PENDING` diretamente para `DELIVERED`). A `OrderService::transition()` delega sempre na *state machine*, o que torna a regra única e testável de forma isolada.

---

## A inserir em → **3.4 Diagramas de Sequência** (acrescentar como nova subsecção 3.4.4)

### 3.4.4 Fluxo de Atribuição de Estafeta (DeliveryOffer)

O sistema implementa um mecanismo de *push assignment* baseado em ofertas com tempo de vida limitado, em vez de um modelo *pull* onde os estafetas pesquisam manualmente pedidos disponíveis.

Sequência:

1. O restaurante despoleta `startPreparingOrder` (mutation GraphQL). Esta operação está envolvida em transação (`#[Transactional]`) e executa atomicamente: transição do estado da encomenda para `PREPARING`, criação da `Delivery` em estado `PENDING`, e dispatch do job `AssignCourierToDeliveryJob` após commit.
2. O job seleciona o estafeta candidato: filtra todos os estafetas com `status = AVAILABLE` que ainda não receberam oferta para esta delivery, ordena por distância geodésica (`GeoMath::distanceKm`) ao endereço do restaurante, e escolhe o mais próximo.
3. É criada uma `DeliveryOffer` com TTL de 30 segundos. O evento `JOB_OFFERED` é publicado no canal Reverb `courier.{courierId}.jobs` e o `CourierAppScreen` da aplicação móvel apresenta o cartão de aceitação em tempo real.
4. Em paralelo é despachado o job `ExpireDeliveryOfferJob` (com delay de 30 s). Se a oferta não for aceite até lá, o job marca-a como `EXPIRED` e re-despacha `AssignCourierToDeliveryJob` para tentar o próximo estafeta.
5. O ciclo repete-se até a oferta ser aceite ou ser atingido o limite `MAX_ASSIGNMENT_ATTEMPTS = 3`. Esgotadas as tentativas, a delivery é marcada como `FAILED` com motivo `NO_COURIER_AVAILABLE`.

Quando o estafeta aceita (`acceptDeliveryOffer`), o serviço bloqueia a row da oferta com `lockForUpdate()` (prevenindo *race conditions* caso o mesmo estafeta tenha múltiplas instâncias da app abertas), associa o `courier_id` à delivery, publica `DELIVERY_ACCEPTED` no canal `order.{orderId}.tracking` e altera o estado do estafeta para `BUSY`.

Esta abordagem combina três propriedades importantes: *fairness* (ofertas distribuídas por proximidade), *liveness* (ninguém fica indefinidamente à espera de aceitar) e *consistency* (a aceitação é atómica com `lockForUpdate`).

> *Nota: ver o Diagrama de Sequência correspondente no anexo (`04_sequencia_aceitar_pedido.puml`).*

---

## A inserir em → **4.2 Implementação do Backend** (criar subsecção nova **4.2.1 Programação Orientada a Aspetos**, mover o restante de 4.2 para 4.2.2)

### 4.2.1 Programação Orientada a Aspetos

A Programação Orientada a Aspetos (POA) é um dos paradigmas exigidos pelo enunciado. A sua aplicação no FastBite foi feita recorrendo à biblioteca **Ray.Aop**, que disponibiliza interceção de métodos a nível de runtime através de *proxy objects* gerados dinamicamente.

A arquitetura POA do projeto define três interceptores transversais a todos os *services* do domínio:

- **`TransactionInterceptor`** — envolve qualquer método anotado com `#[Transactional]` numa transação de base de dados. O atributo permite parametrizar a conexão e o número de tentativas:

```php
public function invoke(MethodInvocation $invocation): mixed
{
    $transactional = $this->transactionalAttribute($invocation) ?? new Transactional;
    $connection = $transactional->connection !== null
        ? DB::connection($transactional->connection)
        : DB::connection();

    return $connection->transaction(
        fn () => $invocation->proceed(),
        $transactional->attempts
    );
}
```

- **`LoggingInterceptor`** — regista para cada chamada o início, o fim e a duração em milissegundos, sem qualquer modificação ao código de negócio.
- **`ErrorHandlingInterceptor`** — normaliza exceções e produz logs estruturados para diagnóstico.

A configuração é centralizada no `RayAopServiceProvider`, que faz o *binding* entre os matchers e os interceptores:

```php
$aspect->bind(
    (new Matcher)->any(),
    (new Matcher)->annotatedWith(Transactional::class),
    [new TransactionInterceptor]
);
$aspect->bind(
    (new Matcher)->any(),
    (new Matcher)->any(),
    [new ErrorHandlingInterceptor, new LoggingInterceptor]
);
```

Esta separação tem duas vantagens diretas: (i) o código de negócio dos *services* fica livre de preocupações transversais como `DB::beginTransaction()` / `commit()` / `rollback()`, melhorando legibilidade e densidade semântica; (ii) o comportamento transacional pode ser alterado num único ponto (o interceptor) sem ter de tocar nas dezenas de métodos anotados. A título indicativo, o `#[Transactional]` está atualmente aplicado em mais de 40 métodos espalhados por `CartService`, `OrderService`, `DeliveryService`, `PaymentService`, `ChatService`, `CouponService`, entre outros.

Exemplo concreto de utilização em `OrderService`:

```php
#[Transactional]
public function startPreparingOrder(string $actorUserId, string $orderId): Order
{
    $order = Order::query()->findOrFail($orderId);
    $order = $this->transition($order, OrderStatus::PREPARING, OrderEventType::ORDER_PREPARING, $actorUserId);
    $order->loadMissing(['restaurant.address', 'address']);
    $deliveryFee = app(OrderPricingService::class)->deliveryFee($order->restaurant, $order->address);
    $delivery = app(DeliveryServiceInterface::class)->createDeliveryForOrder($order->id, $deliveryFee);
    AssignCourierToDeliveryJob::dispatch($delivery->id)->afterCommit();
    return $order;
}
```

Cinco operações de domínio acontecem dentro da mesma transação sem que o método tenha de gerir explicitamente o ciclo `begin/commit/rollback` — esse comportamento é injetado pelo aspect.

---

## A inserir em → **4.2 Implementação do Backend** (nova subsecção **4.2.3 Event Sourcing e Outbox Pattern**)

### 4.2.3 Event Sourcing e Outbox Pattern

A arquitetura *event-driven* do FastBite assenta em duas camadas distintas mas complementares: **persistência de eventos de domínio** (event sourcing parcial) e **publicação fiável** (transactional outbox).

#### Tabelas de eventos por agregado

Para cada agregado de domínio com ciclo de vida não trivial — `Order`, `Payment`, `Delivery` — existe uma tabela dedicada de eventos:

- `order_events` — armazena `ORDER_CREATED`, `ORDER_CONFIRMED`, `ORDER_PREPARING`, `ORDER_READY`, `ORDER_PICKED_UP`, `ORDER_OUT_FOR_DELIVERY`, `ORDER_DELIVERED`, `ORDER_CANCELLED`, `ORDER_REJECTED`, `ORDER_COURIER_ASSIGNED`.
- `payment_events` — `PAYMENT_CREATED`, `PAYMENT_COMPLETED`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, `PAYMENT_CANCELLED`.
- `delivery_events` — `DELIVERY_ACCEPTED`, `DELIVERY_PICKED_UP`, `DELIVERY_IN_TRANSIT`, `DELIVERY_DELIVERED`, `DELIVERY_FAILED`.

Cada row é imutável e contém o tipo do evento, *timestamp* e payload em JSON. Esta abordagem fornece automaticamente:

- **Auditoria completa** — qualquer transição de estado fica registada com o autor (`actor_user_id`) e o contexto.
- **Reconstrução do estado** — em caso de inconsistência, é possível replayar os eventos para recompor o estado corrente.
- **Telemetria de domínio** — métricas como "tempo médio entre `ORDER_CONFIRMED` e `ORDER_READY`" são obtidas com uma query SQL simples.

#### Outbox Pattern

A propagação destes eventos para os subscritores externos (clientes via WebSocket, sistemas de notificação) é feita via a tabela `outbox_events`. O fluxo é o seguinte:

1. Dentro da mesma transação em que o evento de domínio é persistido (`order_events` etc.), o service também faz `INSERT` na `outbox_events` com `status = PENDING`.
2. Um *worker* em background (`OutboxEventWorker`) faz polling à tabela, escolhe os eventos `PENDING` ordenados por `next_attempt_at`, e dispara o evento Laravel `DomainEventBroadcasted`, que por sua vez é difundido pelo Reverb nos canais indicados no payload.
3. Em caso de falha, o evento volta a `PENDING` com `retry_count` incrementado e *backoff* exponencial via `next_attempt_at`.

Esta arquitetura resolve um problema clássico de sistemas distribuídos: se a persistência do evento de domínio e a publicação no broker fossem operações separadas, uma falha entre as duas poderia deixar um evento publicado sem ter sido persistido (ou vice-versa). Ao escrever na `outbox_events` dentro da mesma transação, garante-se que a publicação **eventualmente** acontece, sem perder consistência.

A separação clara entre **eventos de domínio persistidos** (a verdade do sistema) e **eventos broadcast** (visão *push* para os subscritores) é deliberada: a primeira camada é durável e auditável; a segunda é efémera, focada em latência e em fornecer reatividade às interfaces.

---

## A inserir em → **4.5 Implementação do Frontend** (nova subsecção **4.5.3 Push Notifications e Deep Linking**)

### 4.5.3 Push Notifications e Deep Linking

A aplicação móvel suporta notificações remotas via **Expo Notifications**, fornecendo *tokens* push registados no backend através da mutation GraphQL `registerPushToken`.

O fluxo de registo é o seguinte:

1. Após login do utilizador, `App.js` invoca `registerDevicePushToken(session)`.
2. O serviço solicita permissão de notificações ao SO (com fallback gracioso para Expo Go em Android, que não suporta push remoto desde o SDK 53).
3. Em iOS, *development build* ou produção, é obtido o token via `Notifications.getExpoPushTokenAsync()` e enviado para o backend, que persiste em `user_push_tokens` (com `is_active`, `platform`, `provider`).
4. O backend usa estes tokens para notificações *server-side* (ex.: alerta de pedido aceite quando a app está em background ou *killed state*).

Adicionalmente, foi implementado *deep linking*: quando o utilizador toca numa notificação relacionada com um pedido, a app abre diretamente no ecrã de tracking desse pedido. Isto é feito com `Notifications.addNotificationResponseReceivedListener` (para a app em foreground/background) e `Notifications.getLastNotificationResponseAsync` (para *cold starts* a partir da notificação).

A escolha do Expo simplifica a integração FCM/APNS: o backend só precisa de enviar para a Expo Push API, que abstrai a diferença entre os dois fornecedores nativos.

---

## A inserir em → **4.5 Implementação do Frontend** (nova subsecção **4.5.4 Programação Funcional**)

### 4.5.4 Programação Funcional

Apesar do PHP e do JavaScript serem linguagens predominantemente orientadas a objetos, foi feita uma utilização sistemática de construções funcionais ao longo do projeto, em particular onde a clareza beneficia de pureza e imutabilidade.

Exemplos concretos:

- **Enums tipados imutáveis** — `OrderStatus`, `OrderEventType`, `DeliveryStatus`, `PaymentMethod` e os restantes são *backed enums* PHP, garantindo que os estados são tratados como valores opacos sem possibilidade de mutação acidental.
- **Predicados puros para regras de domínio** — por exemplo,  recebe uma coleção de estados e devolve um booleano, sem efeitos colaterais. É facilmente testável de forma isolada e reutilizável noutros pontos do código.
- **Composição via *collection pipelines*** — o `AssignCourierToDeliveryJob` filtra estafetas, calcula distâncias e ordena num *pipeline* expressivo de operações encadeadas:

```php
$couriers = Courier::query()
    ->where('status', CourierStatus::AVAILABLE->value)
    ->when($attemptedCourierIds !== [], fn ($q) =>
        $q->whereNotIn('user_id', $attemptedCourierIds))
    ->get()
    ->sortBy(fn (Courier $c) => GeoMath::distanceKm(...));
```

- **Funções de ordem superior nos transcetores** — o `TransactionInterceptor` recebe a invocação do método como uma closure passada a `DB::transaction(fn () => $invocation->proceed(), $attempts)`, isolando a operação envolvida.
- **Imutabilidade na resposta GraphQL** — os *resolvers* devolvem coleções transformadas (`->map(...)`) sem mutarem os modelos originais.

Esta abordagem reduz a superfície de *bugs* relacionados com estado partilhado, e torna o código mais próximo de uma descrição declarativa do *quê* em vez do *como*.

---

## A retirar de → **5.2 Conclusão e trabalho futuro**

Remover **"notificações push"** da lista de trabalho futuro (atualmente em "Funcionalidades adicionais"), porque já está implementado (ver 4.5.3 acima).

Substituir por uma alternativa em aberto, por exemplo:

> **Notificações push agrupadas e silenciosas** — atualmente cada evento gera uma notificação independente; um *digest* horário (`5 atualizações ao seu pedido`) e *silent push* para sincronização em background reduziriam a fadiga de notificações.

---

## Inserir no início → adicionar a sigla **AOP** e **POA** no glossário (se houver) ou explicar à primeira ocorrência

Sugestão de frase para a primeira ocorrência em **1.1.1 Objetivos**:

> *Programação Orientada a Aspetos (POA / AOP) — paradigma que permite separar preocupações transversais (transações, logging, controlo de acesso) do código de negócio, recorrendo a interceptores aplicados via metadados ou expressões de matching.*
