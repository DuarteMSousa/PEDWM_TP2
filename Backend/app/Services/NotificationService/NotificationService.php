<?php

namespace App\Services\NotificationService;

use App\Aspects\Transactional;
use App\DTOs\Notification\CreateNotificationDTO;
use App\Enums\NotificationType;
use App\Jobs\SendPushNotificationJob;
use App\Models\Notification;
use App\Notifications\UserSystemNotification;
use App\Repositories\NotificationRepository\NotificationRepositoryInterface;
use App\Repositories\UserPushTokenRepository\UserPushTokenRepositoryInterface;
use App\Services\OutboxService;
use BackedEnum;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class NotificationService implements NotificationServiceInterface
{
    public function __construct(
        private OutboxService $outboxService,
        private NotificationMapper $mapper,
        private NotificationRepositoryInterface $notifications,
        private UserPushTokenRepositoryInterface $pushTokens,
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

    public function dispatchChannels(string $notificationId, array $payload): void
    {
        $notification = $this->notifications->getDispatchableById($notificationId);

        if (! $notification) {
            return;
        }

        if ($notification->user?->email) {
            $notification->user->notify(new UserSystemNotification($payload));
        }

        $pushTokens = $this->pushTokens->getActiveByUserId($notification->user_id);

        foreach ($pushTokens as $pushToken) {
            SendPushNotificationJob::dispatch($pushToken->id, $payload);
        }

        Log::info('notification.channels.dispatched', [
            'notification_id' => $notification->id,
            'user_id' => $notification->user_id,
            'email' => (bool) $notification->user?->email,
            'push_tokens' => $pushTokens->count(),
            'type' => $notification->type->value,
        ]);
    }

    public function sendPushNotification(string $pushTokenId, array $payload): void
    {
        $pushToken = $this->pushTokens->getById($pushTokenId);

        if (! $pushToken || ! $pushToken->is_active) {
            return;
        }

        if ($pushToken->provider !== 'expo') {
            Log::warning('push.provider.unsupported', [
                'push_token_id' => $pushToken->id,
                'provider' => $pushToken->provider,
            ]);

            return;
        }

        $response = Http::timeout(8)
            ->acceptJson()
            ->post('https://exp.host/--/api/v2/push/send', [
                'to' => $pushToken->token,
                'title' => (string) ($payload['title'] ?? 'FastBite'),
                'body' => (string) ($payload['message'] ?? ''),
                'data' => [
                    'notification_id' => $payload['notificationId'] ?? null,
                    'type' => $payload['type'] ?? 'SYSTEM',
                    'meta' => $payload['data'] ?? [],
                ],
            ]);

        if (! $response->successful()) {
            Log::warning('push.send.failed', [
                'push_token_id' => $pushToken->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return;
        }

        $this->pushTokens->markUsed($pushToken);
    }

    private function createFromDTO(CreateNotificationDTO $dto): Notification
    {
        $notification = $this->notifications->createNotification($dto);
        $sentAt = $notification->sent_at ?? now();

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
