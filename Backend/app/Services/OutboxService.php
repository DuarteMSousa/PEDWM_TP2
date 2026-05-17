<?php

namespace App\Services;

use App\Jobs\PublishOutboxEventJob;
use App\Models\OutboxEvent;

class OutboxService
{
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
        $outbox = OutboxEvent::query()->create([
            'aggregate_type' => $aggregateType,
            'aggregate_id' => $aggregateId,
            'event_name' => $eventName,
            'payload' => $payload,
            'status' => 'PENDING',
            'retry_count' => 0,
            'next_attempt_at' => now(),
        ]);

        if ($dispatchNow) {
            PublishOutboxEventJob::dispatch($outbox->id)->afterCommit();
        }

        return $outbox;
    }
}
