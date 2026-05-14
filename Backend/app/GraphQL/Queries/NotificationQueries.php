<?php

namespace App\GraphQL\Queries;

use App\Models\Notification;
use App\Support\ResolvesAuthenticatedUser;

class NotificationQueries
{
    use ResolvesAuthenticatedUser;

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, array<string, mixed>>
     */
    public function userNotifications(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        $limit = isset($args['limit']) ? max(1, min((int) $args['limit'], 100)) : 50;
        $unreadOnly = (bool) ($args['unread_only'] ?? false);

        $query = Notification::query()
            ->where('user_id', $user->id)
            ->orderByDesc('sent_at');

        if ($unreadOnly) {
            $query->whereNull('read_at');
        }

        return $query
            ->limit($limit)
            ->get()
            ->map(fn (Notification $notification): array => [
                'id' => $notification->id,
                'type' => $notification->type->value,
                'title' => $notification->title,
                'message' => $notification->message,
                'sent_at' => $notification->sent_at?->toIso8601String(),
                'read_at' => $notification->read_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

}
