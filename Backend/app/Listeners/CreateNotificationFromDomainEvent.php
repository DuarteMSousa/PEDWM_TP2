<?php

namespace App\Listeners;

use App\Events\NotificationEventRecorded;
use App\Services\NotificationService\NotificationServiceInterface;

class CreateNotificationFromDomainEvent
{
    public function __construct(private NotificationServiceInterface $notificationService)
    {
    }

    public function handle(NotificationEventRecorded $event): void
    {
        $this->notificationService->createFromEvent($event->eventType, $event->payload);
    }
}
