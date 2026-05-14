<?php

namespace App\DTOs\Order;

use App\Enums\OrderStatus;
use Spatie\LaravelData\Data;

class UpdateOrderDTO extends Data
{
    public function __construct(
        public readonly OrderStatus $status,
    ) {
    }
}
