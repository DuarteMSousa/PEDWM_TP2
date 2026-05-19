<?php

namespace App\DTOs\Delivery;

use App\Enums\DeliveryOfferStatus;
use Carbon\CarbonInterface;

final readonly class UpdateDeliveryOfferDTO
{
    public function __construct(
        public ?DeliveryOfferStatus $status = null,
        public ?CarbonInterface $acceptedAt = null,
        public ?CarbonInterface $rejectedAt = null,
    ) {
    }
}
