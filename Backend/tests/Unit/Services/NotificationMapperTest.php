<?php

namespace Tests\Unit\Services;

use App\Enums\NotificationType;
use App\Enums\OrderEventType;
use App\Enums\PaymentEventType;
use App\Enums\DeliveryOfferEventType;
use App\Services\NotificationService\NotificationMapper;
use PHPUnit\Framework\TestCase;

class NotificationMapperTest extends TestCase
{
    public function test_maps_order_ready_event_to_notification_dto(): void
    {
        $dto = (new NotificationMapper())->map(OrderEventType::ORDER_READY, [
            'eventName' => OrderEventType::ORDER_READY->value,
            'orderId' => 'order-1',
            'customerId' => 'customer-1',
            'actorId' => 'manager-1',
            'status' => 'READY',
        ]);

        $this->assertNotNull($dto);
        $this->assertSame('customer-1', $dto->userId);
        $this->assertSame(NotificationType::ORDER_UPDATE, $dto->type);
        $this->assertSame('Pedido pronto', $dto->title);
        $this->assertSame('O pedido esta pronto para recolha.', $dto->message);
        $this->assertSame('order-1', $dto->data['order_id']);
        $this->assertSame('READY', $dto->data['status']);
        $this->assertSame('manager-1', $dto->actorId);
    }

    public function test_maps_created_order_with_pending_payment_to_pending_message(): void
    {
        $dto = (new NotificationMapper())->map(OrderEventType::ORDER_CREATED, [
            'eventName' => OrderEventType::ORDER_CREATED->value,
            'orderId' => 'order-1',
            'customerId' => 'customer-1',
            'restaurantName' => 'Fast Pizza',
            'paymentStatus' => 'PENDING',
            'actorId' => 'customer-1',
        ]);

        $this->assertNotNull($dto);
        $this->assertSame('Pedido criado', $dto->title);
        $this->assertSame('O teu pedido em Fast Pizza aguarda pagamento.', $dto->message);
    }

    public function test_ignores_created_order_with_completed_payment_to_avoid_duplicate_confirmed_notification(): void
    {
        $this->assertNull((new NotificationMapper())->map(OrderEventType::ORDER_CREATED, [
            'eventName' => OrderEventType::ORDER_CREATED->value,
            'orderId' => 'order-1',
            'customerId' => 'customer-1',
            'restaurantName' => 'Fast Pizza',
            'paymentStatus' => 'COMPLETED',
            'actorId' => 'customer-1',
        ]));
    }

    public function test_maps_courier_job_offer_to_courier_notification(): void
    {
        $dto = (new NotificationMapper())->map(DeliveryOfferEventType::JOB_OFFERED, [
            'eventName' => DeliveryOfferEventType::JOB_OFFERED->value,
            'offerId' => 'offer-1',
            'deliveryId' => 'delivery-1',
            'courierId' => 'courier-1',
            'expiresAt' => '2026-05-17T21:00:00+00:00',
        ]);

        $this->assertNotNull($dto);
        $this->assertSame('courier-1', $dto->userId);
        $this->assertSame('Nova proposta de entrega', $dto->title);
        $this->assertSame('offer-1', $dto->data['offer_id']);
        $this->assertSame('delivery-1', $dto->data['delivery_id']);
    }

    public function test_returns_null_for_events_without_notification(): void
    {
        $this->assertNull((new NotificationMapper())->map(PaymentEventType::PAYMENT_CREATED, []));
    }

    public function test_returns_null_when_required_recipient_is_missing(): void
    {
        $this->assertNull((new NotificationMapper())->map(OrderEventType::ORDER_READY, [
            'eventName' => OrderEventType::ORDER_READY->value,
            'orderId' => 'order-1',
        ]));
    }
}
