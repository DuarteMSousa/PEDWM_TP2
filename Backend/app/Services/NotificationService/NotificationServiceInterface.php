<?php

namespace App\Services\NotificationService;

use App\Enums\NotificationType;
use App\Models\Notification;

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
}
