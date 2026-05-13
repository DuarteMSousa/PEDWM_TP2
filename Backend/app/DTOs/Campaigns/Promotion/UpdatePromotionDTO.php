<?php

namespace App\DTOs\Campaigns\Promotion;

use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use Carbon\Carbon;
use Spatie\LaravelData\Data;

class UpdatePromotionDTO extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $description,
        public readonly DiscountType $type,
        public readonly DiscountTarget $target,
        public readonly Carbon $start_date,
        public readonly Carbon $end_date,
    ) {
    }

}
