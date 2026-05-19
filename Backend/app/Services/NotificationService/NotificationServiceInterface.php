<?php

namespace App\Services\NotificationService;

use App\Enums\NotificationType;
use App\Models\Notification;
use BackedEnum;

interface NotificationServiceInterface
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function createAndDispatch(
        string $userId,
        NotificationType $type,
        string $title,
        string $message,
        array $data = [],
        ?string $actorId = null
    ): Notification;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function createFromEvent(BackedEnum $eventType, array $payload): ?Notification;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function dispatchChannels(string $notificationId, array $payload): void;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function sendPushNotification(string $pushTokenId, array $payload): void;
}
