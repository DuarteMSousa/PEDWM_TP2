<?php

namespace App\GraphQL\Queries;

use App\Services\NotificationFeedService\NotificationFeedServiceInterface;

class NotificationQueries
{
    public function __construct(private NotificationFeedServiceInterface $notificationFeedService)
    {
    }

    public function clientNotifications($_, array $args)
    {
        return $this->notificationFeedService->getNotificationsByUserId(
            $args['user_id'],
            $args['unread_only'] ?? false,
            $args['limit'] ?? 50
        );
    }
}
