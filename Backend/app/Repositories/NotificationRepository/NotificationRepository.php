<?php

namespace App\Repositories\NotificationRepository;

use App\DTOs\Notification\CreateNotificationDTO;
use App\Models\Notification;

class NotificationRepository implements NotificationRepositoryInterface
{
    public function getDispatchableById(string $id): ?Notification
    {
        return Notification::query()->with('user')->whereKey($id)->first();
    }

    public function getByUserId(string $userId, bool $unreadOnly, int $limit)
    {
        $query = Notification::query()
            ->where('user_id', $userId)
            ->orderByDesc('sent_at')
            ->limit($limit);

        if ($unreadOnly) {
            $query->whereNull('read_at');
        }

        return $query->get();
    }

    public function createNotification(CreateNotificationDTO $data): Notification
    {
        return Notification::query()->create([
            'user_id' => $data->userId,
            'type' => $data->type,
            'title' => $data->title,
            'message' => $data->message,
            'sent_at' => now(),
        ]);
    }

    public function markAsReadByUserId(string $userId, string $notificationId): Notification
    {
        $notification = Notification::query()
            ->where('user_id', $userId)
            ->findOrFail($notificationId);

        $notification->update(['read_at' => now()]);

        return $notification;
    }

    public function markAllAsReadByUserId(string $userId): int
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }
}
