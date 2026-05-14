<?php

namespace App\Jobs;

use App\Models\UserPushToken;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
        /** @var UserPushToken|null $pushToken */
        $pushToken = UserPushToken::query()->whereKey($this->pushTokenId)->first();

        if (! $pushToken || ! $pushToken->is_active) {
            return;
        }

        if ($pushToken->provider !== 'expo') {
            Log::warning('push.provider.unsupported', [
                'push_token_id' => $pushToken->id,
                'provider' => $pushToken->provider,
            ]);

            return;
        }

        $response = Http::timeout(8)
            ->acceptJson()
            ->post('https://exp.host/--/api/v2/push/send', [
                'to' => $pushToken->token,
                'title' => (string) ($this->payload['title'] ?? 'FastBite'),
                'body' => (string) ($this->payload['message'] ?? ''),
                'data' => [
                    'notification_id' => $this->payload['notificationId'] ?? null,
                    'type' => $this->payload['type'] ?? 'SYSTEM',
                    'meta' => $this->payload['data'] ?? [],
                ],
            ]);

        if (! $response->successful()) {
            Log::warning('push.send.failed', [
                'push_token_id' => $pushToken->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return;
        }

        $pushToken->update(['last_used_at' => now()]);
    }
}

