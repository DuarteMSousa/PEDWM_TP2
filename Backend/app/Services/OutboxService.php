<?php

namespace App\Services;

use App\DTOs\Outbox\CreateOutboxEventDTO;
use App\Jobs\PublishOutboxEventJob;
use App\Models\OutboxEvent;
use App\Repositories\OutboxRepository\OutboxRepositoryInterface;

class OutboxService
{
    public function __construct(private OutboxRepositoryInterface $outboxEvents) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function enqueue(
        string $aggregateType,
        ?string $aggregateId,
        string $eventName,
        array $payload,
        bool $dispatchNow = true
    ): OutboxEvent {
        $outbox = $this->outboxEvents->createOutboxEvent(new CreateOutboxEventDTO(
            aggregateType: $aggregateType,
            aggregateId: $aggregateId,
            eventName: $eventName,
            payload: $payload,
        ));

        if ($dispatchNow) {
            PublishOutboxEventJob::dispatch($outbox->id)->afterCommit();
        }

        return $outbox;
    }
}
