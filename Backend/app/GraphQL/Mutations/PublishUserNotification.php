<?php

namespace App\GraphQL\Mutations;

use App\Events\UserNotificationCreated;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Str;

class PublishUserNotification
{
    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $actor = auth()->user();

        if (! $actor && app()->environment(['local', 'testing'])) {
            $devUserId = request()->header('X-Dev-User-Id');
            if ($devUserId) {
                $actor = User::query()->find($devUserId);
            }
        }

        if (! $actor) {
            throw new AuthenticationException('Authentication required.');
        }

        $input = $args['input'];
        $sentAt = Carbon::now();

        $notification = Notification::query()->create([
            'user_id' => $input['user_id'],
            'type' => $input['type'],
            'title' => $input['title'],
            'message' => $input['message'],
            'sent_at' => $sentAt,
        ]);

        $payload = [
            'eventId' => (string) Str::uuid(),
            'eventName' => 'USER_NOTIFICATION_CREATED',
            'notificationId' => $notification->id,
            'userId' => $notification->user_id,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'sentAt' => $sentAt->toIso8601String(),
            'actorId' => $actor->id,
        ];

        event(new UserNotificationCreated($payload));

        return [
            'ok' => true,
            'notification_id' => $notification->id,
            'sent_at' => $sentAt->format('Y-m-d H:i:s'),
        ];
    }
}
