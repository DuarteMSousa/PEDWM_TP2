<?php

namespace App\Services\NotificationService;

use App\DTOs\Notification\CreateNotificationDTO;
use App\Enums\DeliveryEventType;
use App\Enums\DeliveryOfferEventType;
use App\Enums\NotificationType;
use App\Enums\OrderEventType;
use BackedEnum;

class NotificationMapper
{
    /**
     * @var array<string, mixed>
     */
    private array $map;

    public function __construct()
    {
        $this->map = [
            OrderEventType::ORDER_CREATED->value => fn (array $payload): ?CreateNotificationDTO => $this->orderCreated($payload),
            OrderEventType::ORDER_CONFIRMED->value => fn (array $payload): ?CreateNotificationDTO => $this->orderUpdate(
                $payload,
                'Pedido confirmado',
                'O pagamento foi confirmado e o pedido avancou.'
            ),
            OrderEventType::ORDER_PREPARING->value => fn (array $payload): ?CreateNotificationDTO => $this->orderUpdate(
                $payload,
                'Pedido em preparacao',
                'O restaurante aceitou o pedido e comecou a preparacao.'
            ),
            OrderEventType::ORDER_READY->value => fn (array $payload): ?CreateNotificationDTO => $this->orderUpdate(
                $payload,
                'Pedido pronto',
                'O pedido esta pronto para recolha.'
            ),
            OrderEventType::ORDER_OUT_FOR_DELIVERY->value => fn (array $payload): ?CreateNotificationDTO => $this->orderUpdate(
                $payload,
                'Pedido a caminho',
                'O pedido saiu para entrega.'
            ),
            OrderEventType::ORDER_DELIVERED->value => fn (array $payload): ?CreateNotificationDTO => $this->orderUpdate(
                $payload,
                'Pedido entregue',
                'O pedido foi entregue.'
            ),
            OrderEventType::ORDER_CANCELLED->value => fn (array $payload): ?CreateNotificationDTO => $this->orderUpdate(
                $payload,
                'Pedido cancelado',
                (string) ($payload['data']['reason'] ?? 'O pedido foi cancelado.')
            ),
            DeliveryOfferEventType::JOB_OFFERED->value => fn (array $payload): ?CreateNotificationDTO => $this->courierJobOffered($payload),
            OrderEventType::ORDER_COURIER_ASSIGNED->value => fn (array $payload): ?CreateNotificationDTO => $this->orderUpdate(
                $payload,
                'Estafeta atribuido',
                'O teu pedido ja tem estafeta atribuido.'
            ),
            OrderEventType::ORDER_PICKED_UP->value => fn (array $payload): ?CreateNotificationDTO => $this->orderUpdate(
                $payload,
                'Pedido recolhido',
                'O estafeta recolheu o teu pedido no restaurante.'
            ),
            DeliveryEventType::DELIVERY_FAILED->value => fn (array $payload): ?CreateNotificationDTO => $this->orderUpdate(
                $payload,
                'Problema na entrega',
                'A entrega teve uma falha e sera acompanhada pelo restaurante.'
            ),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function map(BackedEnum $eventType, array $payload): ?CreateNotificationDTO
    {
        $factory = $this->map[$eventType->value] ?? null;

        return $factory ? $factory($payload) : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function orderCreated(array $payload): ?CreateNotificationDTO
    {
        $paymentStatus = $payload['paymentStatus'] ?? $payload['data']['paymentStatus'] ?? null;

        if ($paymentStatus === 'COMPLETED') {
            return null;
        }

        $restaurantName = $payload['restaurantName'] ?? 'o restaurante';

        return $this->orderUpdate(
            $payload,
            'Pedido criado',
            "O teu pedido em {$restaurantName} aguarda pagamento."
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function orderUpdate(array $payload, string $title, string $message): ?CreateNotificationDTO
    {
        $userId = $payload['customerId'] ?? $payload['userId'] ?? null;

        if (! $userId) {
            return null;
        }

        return new CreateNotificationDTO(
            userId: (string) $userId,
            type: NotificationType::ORDER_UPDATE,
            title: $title,
            message: $message,
            data: [
                'order_id' => $payload['orderId'] ?? null,
                'delivery_id' => $payload['deliveryId'] ?? null,
                'event_name' => $payload['eventName'] ?? null,
                'status' => $payload['status'] ?? null,
                'reason' => $payload['data']['reason'] ?? $payload['data']['failure_reason'] ?? null,
            ],
            actorId: isset($payload['actorId']) ? (string) $payload['actorId'] : null,
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function courierJobOffered(array $payload): ?CreateNotificationDTO
    {
        $courierId = $payload['courierId'] ?? null;

        if (! $courierId) {
            return null;
        }

        return new CreateNotificationDTO(
            userId: (string) $courierId,
            type: NotificationType::ORDER_UPDATE,
            title: 'Nova proposta de entrega',
            message: 'Tens uma nova entrega disponivel para aceitar.',
            data: [
                'offer_id' => $payload['offerId'] ?? null,
                'delivery_id' => $payload['deliveryId'] ?? null,
                'event_name' => $payload['eventName'] ?? DeliveryOfferEventType::JOB_OFFERED->value,
                'expires_at' => $payload['expiresAt'] ?? null,
            ],
            actorId: isset($payload['actorId']) ? (string) $payload['actorId'] : null,
        );
    }
}
