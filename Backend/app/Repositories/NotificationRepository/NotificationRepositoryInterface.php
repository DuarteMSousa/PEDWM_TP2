<?php

namespace App\Repositories\NotificationRepository;

use App\DTOs\Notification\CreateNotificationDTO;
use App\Models\Notification;

interface NotificationRepositoryInterface
{
    public function getDispatchableById(string $id): ?Notification;

    public function getByUserId(string $userId, bool $unreadOnly, int $limit);

    public function createNotification(CreateNotificationDTO $data): Notification;

    public function markAsReadByUserId(string $userId, string $notificationId): Notification;

    public function markAllAsReadByUserId(string $userId): int;
}
