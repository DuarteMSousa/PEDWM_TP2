<?php

namespace App\DTOs\Delivery;

use App\Enums\DeliveryStatus;
use Carbon\CarbonInterface;

final readonly class UpdateDeliveryDTO
{
    public function __construct(
        public ?string $courierId = null,
        public ?DeliveryStatus $status = null,
        public ?CarbonInterface $pickupTime = null,
        public ?CarbonInterface $deliveryTime = null,
    ) {
    }
}
