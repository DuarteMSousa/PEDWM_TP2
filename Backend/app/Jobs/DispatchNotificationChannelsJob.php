<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Notifications\UserSystemNotification;
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

        if ($notification->user?->email) {
            $notification->user->notify(new UserSystemNotification($this->payload));
        }

        $pushTokens = $notification->user?->pushTokens()->where('is_active', true)->get() ?? collect();

        foreach ($pushTokens as $pushToken) {
            SendPushNotificationJob::dispatch($pushToken->id, $this->payload);
        }

        Log::info('notification.channels.dispatched', [
            'notification_id' => $notification->id,
            'user_id' => $notification->user_id,
            'email' => (bool) $notification->user?->email,
            'push_tokens' => $pushTokens->count(),
            'type' => $notification->type->value,
        ]);
    }
}
