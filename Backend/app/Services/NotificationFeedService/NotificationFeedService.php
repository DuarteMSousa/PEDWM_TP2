<?php

namespace App\Services\NotificationFeedService;

use App\Aspects\Transactional;
use App\DTOs\Notification\RegisterPushTokenDTO;
use App\Models\Notification;
use App\Models\UserPushToken;

class NotificationFeedService implements NotificationFeedServiceInterface
{
    public function getNotificationsByUserId(string $userId, bool $unreadOnly = false, int $limit = 50)
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

    #[Transactional]
    public function markNotificationAsRead(string $userId, string $notificationId): array
    {
        $notification = Notification::query()
            ->where('user_id', $userId)
            ->findOrFail($notificationId);
        $notification->update(['read_at' => now()]);

        return [
            'ok' => true,
            'notification_id' => $notification->id,
            'read_at' => $notification->read_at?->toIso8601String(),
        ];
    }

    #[Transactional]
    public function markAllNotificationsAsRead(string $userId): array
    {
        $affected = Notification::query()
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return [
            'ok' => true,
            'affected_count' => $affected,
        ];
    }

    #[Transactional]
    public function registerPushToken(string $userId, RegisterPushTokenDTO $data): array
    {
        $token = UserPushToken::query()->updateOrCreate(
            [
                'user_id' => $userId,
                'token' => $data->token,
            ],
            [
                'provider' => $data->provider,
                'platform' => $data->platform,
                'is_active' => true,
                'last_used_at' => now(),
            ]
        );

        return [
            'ok' => true,
            'push_token_id' => $token->id,
            'is_active' => $token->is_active,
        ];
    }

    #[Transactional]
    public function unregisterPushToken(string $userId, string $token): array
    {
        UserPushToken::query()
            ->where('user_id', $userId)
            ->where('token', $token)
            ->update(['is_active' => false]);

        return ['ok' => true];
    }
}
