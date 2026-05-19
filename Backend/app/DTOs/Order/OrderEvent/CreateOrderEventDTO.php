<?php

namespace App\DTOs\Order\OrderEvent;

use App\Enums\OrderEventType;
use Carbon\Carbon;
use Spatie\LaravelData\Data;

class CreateOrderEventDTO extends Data
{
    public function __construct(
        public readonly OrderEventType $event_type,
        public readonly ?Carbon $timestamp = null,
        public readonly ?array $payload = null,
    ) {
    }
}
