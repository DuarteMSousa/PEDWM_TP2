<?php

namespace App\Services\NotificationService;

use App\Aspects\Transactional;
use App\DTOs\Notification\CreateNotificationDTO;
use App\Enums\NotificationType;
use App\Models\Notification;
use App\Services\OutboxService;
use BackedEnum;
use Illuminate\Support\Str;

class NotificationService implements NotificationServiceInterface
{
    public function __construct(
        private OutboxService $outboxService,
        private NotificationMapper $mapper,
    ) {}

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
        return $this->createFromDTO(new CreateNotificationDTO(
            userId: $userId,
            type: $type,
            title: $title,
            message: $message,
            data: $data,
            actorId: $actorId
        ));
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    #[Transactional]
    public function createFromEvent(BackedEnum $eventType, array $payload): ?Notification
    {
        $dto = $this->mapper->map($eventType, $payload);

        return $dto ? $this->createFromDTO($dto) : null;
    }

    private function createFromDTO(CreateNotificationDTO $dto): Notification
    {
        $sentAt = now();

        $notification = Notification::query()->create([
            'user_id' => $dto->userId,
            'type' => $dto->type,
            'title' => $dto->title,
            'message' => $dto->message,
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
            'data' => $dto->data,
            'sentAt' => $sentAt->toIso8601String(),
            'actorId' => $dto->actorId,
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
