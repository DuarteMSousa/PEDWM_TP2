<?php

namespace App\Jobs;

use App\Services\NotificationService\NotificationServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class DispatchNotificationChannelsJob implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(public string $notificationId, public array $payload)
    {
    }

    public function handle(): void
    {
        app(NotificationServiceInterface::class)->dispatchChannels($this->notificationId, $this->payload);
    }
}
