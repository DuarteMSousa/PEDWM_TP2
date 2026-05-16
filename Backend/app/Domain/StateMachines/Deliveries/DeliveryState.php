<?php

namespace App\Domain\StateMachines\Deliveries;

use App\Enums\DeliveryStatus;
use App\Models\Delivery;

interface DeliveryState
{
    public function status(): DeliveryStatus;

    public function canTransitionTo(DeliveryStatus $next): bool;

    public function transition(Delivery $delivery, DeliveryStatus $next, array $extra = []): void;
}
