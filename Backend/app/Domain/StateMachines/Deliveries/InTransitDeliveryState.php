<?php

namespace App\Domain\StateMachines\Deliveries;

use App\Enums\DeliveryStatus;

class InTransitDeliveryState extends AbstractDeliveryState
{
    public function status(): DeliveryStatus
    {
        return DeliveryStatus::IN_TRANSIT;
    }

    protected function allowedTransitions(): array
    {
        return [DeliveryStatus::DELIVERED, DeliveryStatus::FAILED];
    }
}
