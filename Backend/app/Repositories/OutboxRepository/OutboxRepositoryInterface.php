<?php

namespace App\Repositories\OutboxRepository;

use App\DTOs\Outbox\CreateOutboxEventDTO;
use App\Models\OutboxEvent;
use Throwable;

interface OutboxRepositoryInterface
{
    public function createOutboxEvent(CreateOutboxEventDTO $data): OutboxEvent;

    public function getById(string $id): ?OutboxEvent;

    public function markProcessing(OutboxEvent $outbox): OutboxEvent;

    public function markPublished(OutboxEvent $outbox): OutboxEvent;

    public function markRetryAfterFailure(OutboxEvent $outbox, Throwable $exception, int $maxRetries = 10): OutboxEvent;
}
