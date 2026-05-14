<?php

namespace App\Jobs;

use App\Events\ChatMessageSent;
use App\Events\CourierPositionUpdated;
use App\Events\UserNotificationCreated;
use App\Models\OutboxEvent;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
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
        $outbox = OutboxEvent::query()->whereKey($this->outboxEventId)->first();

        if (! $outbox) {
            return;
        }

        if (in_array($outbox->status, ['PUBLISHED'], true)) {
            return;
        }

        $outbox->update(['status' => 'PROCESSING']);

        try {
            $this->publish($outbox->event_name, (array) $outbox->payload);

            $outbox->update([
                'status' => 'PUBLISHED',
                'published_at' => now(),
                'last_error' => null,
            ]);
        } catch (Throwable $exception) {
            DB::transaction(function () use ($outbox, $exception): void {
                $retryCount = $outbox->retry_count + 1;
                $maxRetries = 10;
                $isTerminal = $retryCount >= $maxRetries;

                $outbox->update([
                    'status' => $isTerminal ? 'FAILED' : 'PENDING',
                    'retry_count' => $retryCount,
                    'next_attempt_at' => $isTerminal ? null : now()->addSeconds(min(300, 2 ** $retryCount)),
                    'last_error' => mb_substr($exception->getMessage(), 0, 2000),
                ]);
            });

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
            default => null,
        };
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
