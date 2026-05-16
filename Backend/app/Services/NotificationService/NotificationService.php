<?php

namespace App\Services\NotificationService;

use App\Aspects\Transactional;
use App\Enums\NotificationType;
use App\Models\Notification;
use App\Services\OutboxService;
use Illuminate\Support\Str;

class NotificationService implements NotificationServiceInterface
{
    public function __construct(private OutboxService $outboxService) {}

    /**
     * @param  array<string, mixed>  $data
     */
    #[Transactional]
    public function createAndDispatch(
        string $userId,
        NotificationType $type,
        string $title,
        string $message,
        array $data = [],
        ?string $actorId = null
    ): Notification {
        $sentAt = now();

        $notification = Notification::query()->create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'sent_at' => $sentAt,
        ]);

        $payload = [
            'eventId' => (string) Str::uuid(),
            'eventName' => 'USER_NOTIFICATION_CREATED',
            'notificationId' => $notification->id,
            'userId' => $notification->user_id,
            'type' => $notification->type->value,
            'title' => $notification->title,
            'message' => $notification->message,
            'data' => $data,
            'sentAt' => $sentAt->toIso8601String(),
            'actorId' => $actorId,
        ];

        $this->outboxService->enqueue(
            aggregateType: 'notification',
            aggregateId: $notification->id,
            eventName: 'USER_NOTIFICATION_CREATED',
            payload: $payload
        );

        return $notification;
    }
}
