<?php

namespace App\DTOs\Outbox;

final readonly class CreateOutboxEventDTO
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public string $aggregateType,
        public ?string $aggregateId,
        public string $eventName,
        public array $payload,
    ) {
    }
}
