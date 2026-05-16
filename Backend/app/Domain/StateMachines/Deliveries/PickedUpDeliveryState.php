<?php

namespace App\Domain\StateMachines\Deliveries;

use App\Enums\DeliveryStatus;

class PickedUpDeliveryState extends AbstractDeliveryState
{
    public function status(): DeliveryStatus
    {
        return DeliveryStatus::PICKED_UP;
    }

    protected function allowedTransitions(): array
    {
        return [DeliveryStatus::IN_TRANSIT, DeliveryStatus::FAILED];
    }
}
