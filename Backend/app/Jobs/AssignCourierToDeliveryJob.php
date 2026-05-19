<?php

namespace App\Jobs;

use App\Services\DeliveryService\DeliveryServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AssignCourierToDeliveryJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $deliveryId) {}

    public function handle(): void
    {
        app(DeliveryServiceInterface::class)->assignCourierToDelivery($this->deliveryId);
    }
}
