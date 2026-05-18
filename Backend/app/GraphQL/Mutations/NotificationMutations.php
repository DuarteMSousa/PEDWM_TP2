<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Notification\RegisterPushTokenDTO;
use App\Services\NotificationFeedService\NotificationFeedServiceInterface;

class NotificationMutations
{
    public function __construct(private NotificationFeedServiceInterface $notificationFeedService)
    {
    }

    public function markNotificationRead($_, array $args): array
    {
        return $this->notificationFeedService->markNotificationAsRead($args['user_id'], $args['notification_id']);
    }

    public function markAllClientNotificationsRead($_, array $args): array
    {
        return $this->notificationFeedService->markAllNotificationsAsRead($args['user_id']);
    }

    public function registerPushToken($_, array $args): array
    {
        return $this->notificationFeedService->registerPushToken($args['user_id'], RegisterPushTokenDTO::from($args['input']));
    }

    public function unregisterPushToken($_, array $args): array
    {
        return $this->notificationFeedService->unregisterPushToken($args['user_id'], $args['input']['token']);
    }
}
