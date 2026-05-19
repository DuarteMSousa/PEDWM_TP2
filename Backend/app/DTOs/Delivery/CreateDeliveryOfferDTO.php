<?php

namespace App\DTOs\Delivery;

use App\Enums\DeliveryOfferStatus;
use Carbon\CarbonInterface;

final readonly class CreateDeliveryOfferDTO
{
    public function __construct(
        public string $deliveryId,
        public string $courierId,
        public DeliveryOfferStatus $status,
        public CarbonInterface $expiresAt,
    ) {
    }
}
