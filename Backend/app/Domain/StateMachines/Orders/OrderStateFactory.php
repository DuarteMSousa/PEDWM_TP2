<?php

namespace App\Domain\StateMachines\Orders;

use App\Enums\OrderStatus;

class OrderStateFactory
{
    public static function from(OrderStatus|string $status): OrderState
    {
        $status = $status instanceof OrderStatus ? $status : OrderStatus::from($status);

        return match ($status) {
            OrderStatus::PENDING => new PendingOrderState(),
            OrderStatus::CONFIRMED => new ConfirmedOrderState(),
            OrderStatus::PREPARING => new PreparingOrderState(),
            OrderStatus::READY => new ReadyOrderState(),
            OrderStatus::OUT_FOR_DELIVERY => new OutForDeliveryOrderState(),
            OrderStatus::DELIVERED => new DeliveredOrderState(),
            OrderStatus::CANCELLED => new CancelledOrderState(),
        };
    }
}
