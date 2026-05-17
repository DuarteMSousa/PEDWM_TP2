<?php

namespace App\DTOs\Notification;

use App\Enums\NotificationType;

final readonly class CreateNotificationDTO
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        public string $userId,
        public NotificationType $type,
        public string $title,
        public string $message,
        public array $data = [],
        public ?string $actorId = null,
    ) {
    }
}
