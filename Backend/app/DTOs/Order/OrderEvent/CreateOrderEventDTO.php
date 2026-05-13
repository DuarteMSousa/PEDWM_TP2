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

    public function toArray(): array
    {
        return [
            'event_type' => $this->event_type->value,
            'timestamp' => $this->timestamp,
            'payload' => $this->payload,
        ];
    }
}
