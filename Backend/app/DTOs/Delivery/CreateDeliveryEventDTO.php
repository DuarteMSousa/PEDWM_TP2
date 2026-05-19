<?php

namespace App\DTOs\Delivery;

use App\Enums\DeliveryEventType;
use Carbon\CarbonInterface;

final readonly class CreateDeliveryEventDTO
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public DeliveryEventType $eventType,
        public CarbonInterface $createdAt,
        public array $payload,
    ) {
    }
}
