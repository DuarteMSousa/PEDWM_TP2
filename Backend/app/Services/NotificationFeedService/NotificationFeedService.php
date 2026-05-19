<?php

namespace App\Services\NotificationFeedService;

use App\Aspects\Transactional;
use App\DTOs\Notification\RegisterPushTokenDTO;
use App\Repositories\NotificationRepository\NotificationRepositoryInterface;
use App\Repositories\UserPushTokenRepository\UserPushTokenRepositoryInterface;

class NotificationFeedService implements NotificationFeedServiceInterface
{
    public function __construct(
        private NotificationRepositoryInterface $notifications,
        private UserPushTokenRepositoryInterface $pushTokens,
    ) {}

    public function getNotificationsByUserId(string $userId, bool $unreadOnly = false, int $limit = 50)
    {
        return $this->notifications->getByUserId($userId, $unreadOnly, $limit);
    }

    #[Transactional]
    public function markNotificationAsRead(string $userId, string $notificationId): array
    {
        $notification = $this->notifications->markAsReadByUserId($userId, $notificationId);

        return [
            'ok' => true,
            'notification_id' => $notification->id,
            'read_at' => $notification->read_at?->toIso8601String(),
        ];
    }

    #[Transactional]
    public function markAllNotificationsAsRead(string $userId): array
    {
        $affected = $this->notifications->markAllAsReadByUserId($userId);

        return [
            'ok' => true,
            'affected_count' => $affected,
        ];
    }

    #[Transactional]
    public function registerPushToken(string $userId, RegisterPushTokenDTO $data): array
    {
        $token = $this->pushTokens->upsertByUserId($userId, $data);

        return [
            'ok' => true,
            'push_token_id' => $token->id,
            'is_active' => $token->is_active,
        ];
    }

    #[Transactional]
    public function unregisterPushToken(string $userId, string $token): array
    {
        $this->pushTokens->deactivateByUserIdAndToken($userId, $token);

        return ['ok' => true];
    }
}
