<?php

namespace App\Jobs;

use App\Models\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

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
        /** @var Notification|null $notification */
        $notification = Notification::query()
            ->with('user')
            ->whereKey($this->notificationId)
            ->first();

        if (! $notification) {
            return;
        }

        // MVP stub: orchestration async de canais externos.
        if ($notification->user?->email) {
            Log::info('notification.email.dispatched', [
                'notification_id' => $notification->id,
                'user_id' => $notification->user_id,
                'email' => $notification->user->email,
                'type' => $notification->type->value,
            ]);
        }

        Log::info('notification.push.dispatched', [
            'notification_id' => $notification->id,
            'user_id' => $notification->user_id,
            'type' => $notification->type->value,
        ]);
    }
}

