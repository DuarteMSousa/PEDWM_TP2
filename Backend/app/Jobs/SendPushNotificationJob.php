<?php

namespace App\Jobs;

use App\Services\NotificationService\NotificationServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendPushNotificationJob implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(public string $pushTokenId, public array $payload)
    {
    }

    public function handle(): void
    {
        app(NotificationServiceInterface::class)->sendPushNotification($this->pushTokenId, $this->payload);
    }
}
