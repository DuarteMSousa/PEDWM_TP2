<?php

namespace App\Jobs;

use App\Events\ChatMessageSent;
use App\Events\CourierPositionUpdated;
use App\Events\DomainEventBroadcasted;
use App\Events\UserNotificationCreated;
use App\Models\OutboxEvent;
use App\Repositories\OutboxRepository\OutboxRepositoryInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class PublishOutboxEventJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $outboxEventId)
    {
    }

    public function handle(): void
    {
        /** @var OutboxEvent|null $outbox */
        $outbox = app(OutboxRepositoryInterface::class)->getById($this->outboxEventId);

        if (! $outbox) {
            return;
        }

        if (in_array($outbox->status, ['PUBLISHED'], true)) {
            return;
        }

        $outboxRepository = app(OutboxRepositoryInterface::class);
        $outboxRepository->markProcessing($outbox);

        try {
            $this->publish($outbox->event_name, (array) $outbox->payload);

            $outboxRepository->markPublished($outbox);
        } catch (Throwable $exception) {
            $outboxRepository->markRetryAfterFailure($outbox, $exception);

            throw $exception;
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function publish(string $eventName, array $payload): void
    {
        match ($eventName) {
            'COURIER_POSITION_UPDATED' => event(new CourierPositionUpdated($payload)),
            'CHAT_MESSAGE_SENT' => event(new ChatMessageSent($payload)),
            'USER_NOTIFICATION_CREATED' => $this->publishUserNotification($payload),
            default => $this->publishDomainEvent($eventName, $payload),
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function publishDomainEvent(string $eventName, array $payload): void
    {
        $channels = $payload['channels'] ?? [];

        if (! is_array($channels) || $channels === []) {
            return;
        }

        event(new DomainEventBroadcasted($eventName, $channels, $payload));
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function publishUserNotification(array $payload): void
    {
        event(new UserNotificationCreated($payload));

        if (! isset($payload['notificationId'])) {
            return;
        }

        DispatchNotificationChannelsJob::dispatch(
            notificationId: (string) $payload['notificationId'],
            payload: $payload
        );
    }
}
