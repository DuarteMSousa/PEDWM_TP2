<?php

namespace App\Domain\StateMachines\Deliveries;

use App\Enums\DeliveryStatus;

class PendingDeliveryState extends AbstractDeliveryState
{
    public function status(): DeliveryStatus
    {
        return DeliveryStatus::PENDING;
    }

    protected function allowedTransitions(): array
    {
        return [DeliveryStatus::PICKED_UP, DeliveryStatus::FAILED];
    }
}
