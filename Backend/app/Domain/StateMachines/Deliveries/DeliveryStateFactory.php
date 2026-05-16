<?php

namespace App\Domain\StateMachines\Deliveries;

use App\Enums\DeliveryStatus;

class DeliveryStateFactory
{
    public static function from(DeliveryStatus|string $status): DeliveryState
    {
        $status = $status instanceof DeliveryStatus ? $status : DeliveryStatus::from($status);

        return match ($status) {
            DeliveryStatus::PENDING => new PendingDeliveryState(),
            DeliveryStatus::PICKED_UP => new PickedUpDeliveryState(),
            DeliveryStatus::IN_TRANSIT => new InTransitDeliveryState(),
            DeliveryStatus::DELIVERED => new DeliveredDeliveryState(),
            DeliveryStatus::FAILED => new FailedDeliveryState(),
        };
    }
}
