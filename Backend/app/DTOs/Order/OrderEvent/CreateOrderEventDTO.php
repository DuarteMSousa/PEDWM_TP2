<?php

namespace App\DTOs\Order\OrderEvent;

use App\Enums\OrderEventType;
use Spatie\LaravelData\Data;

class CreateOrderEventDTO extends Data
{
    public function __construct(
        public readonly OrderEventType $event_type,
        public readonly ?string $timestamp = null,
        public readonly ?array $payload = null,
    ) {
    }
}
