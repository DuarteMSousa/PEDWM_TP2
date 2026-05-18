<?php

namespace App\Services\NotificationFeedService;

use App\DTOs\Notification\RegisterPushTokenDTO;

interface NotificationFeedServiceInterface
{
    public function getNotificationsByUserId(string $userId, bool $unreadOnly = false, int $limit = 50);

    public function markNotificationAsRead(string $userId, string $notificationId): array;

    public function markAllNotificationsAsRead(string $userId): array;

    public function registerPushToken(string $userId, RegisterPushTokenDTO $data): array;

    public function unregisterPushToken(string $userId, string $token): array;
}
