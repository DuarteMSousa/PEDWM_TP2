<?php

namespace App\Domain\StateMachines\Deliveries;

use App\Enums\DeliveryStatus;

class DeliveredDeliveryState extends AbstractDeliveryState
{
    public function status(): DeliveryStatus
    {
        return DeliveryStatus::DELIVERED;
    }

    protected function allowedTransitions(): array
    {
        return [];
    }
}
