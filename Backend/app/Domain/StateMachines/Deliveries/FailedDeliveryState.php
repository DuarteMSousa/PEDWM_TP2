<?php

namespace App\Domain\StateMachines\Deliveries;

use App\Enums\DeliveryStatus;

class FailedDeliveryState extends AbstractDeliveryState
{
    public function status(): DeliveryStatus
    {
        return DeliveryStatus::FAILED;
    }

    protected function allowedTransitions(): array
    {
        return [];
    }
}
