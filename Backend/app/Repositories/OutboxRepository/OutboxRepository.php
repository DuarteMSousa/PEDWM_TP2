<?php

namespace App\Repositories\OutboxRepository;

use App\DTOs\Outbox\CreateOutboxEventDTO;
use App\Enums\OutboxStatus;
use App\Models\OutboxEvent;
use Illuminate\Support\Facades\DB;
use Throwable;

class OutboxRepository implements OutboxRepositoryInterface
{
    public function createOutboxEvent(CreateOutboxEventDTO $data): OutboxEvent
    {
        return OutboxEvent::query()->create([
            'aggregate_type' => $data->aggregateType,
            'aggregate_id' => $data->aggregateId,
            'event_name' => $data->eventName,
            'payload' => $data->payload,
            'status' => OutboxStatus::PENDING,
            'retry_count' => 0,
            'next_attempt_at' => now(),
        ]);
    }

    public function getById(string $id): ?OutboxEvent
    {
        return OutboxEvent::query()->whereKey($id)->first();
    }

    public function markProcessing(OutboxEvent $outbox): OutboxEvent
    {
        $outbox->update(['status' => OutboxStatus::PROCESSING]);

        return $outbox;
    }

    public function markPublished(OutboxEvent $outbox): OutboxEvent
    {
        $outbox->update([
            'status' => OutboxStatus::PUBLISHED,
            'published_at' => now(),
            'last_error' => null,
        ]);

        return $outbox;
    }

    public function markRetryAfterFailure(OutboxEvent $outbox, Throwable $exception, int $maxRetries = 10): OutboxEvent
    {
        return DB::transaction(function () use ($outbox, $exception, $maxRetries): OutboxEvent {
            $retryCount = $outbox->retry_count + 1;
            $isTerminal = $retryCount >= $maxRetries;

            $outbox->update([
                'status' => $isTerminal ? OutboxStatus::FAILED : OutboxStatus::PENDING,
                'retry_count' => $retryCount,
                'next_attempt_at' => $isTerminal ? null : now()->addSeconds(min(300, 2 ** $retryCount)),
                'last_error' => mb_substr($exception->getMessage(), 0, 2000),
            ]);

            return $outbox;
        });
    }
}
