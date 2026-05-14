<?php

namespace App\GraphQL\Mutations;

use App\Models\Notification;
use App\Support\ResolvesAuthenticatedUser;
use GraphQL\Error\UserError;

class MarkNotificationRead
{
    use ResolvesAuthenticatedUser;

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        /** @var Notification|null $notification */
        $notification = Notification::query()
            ->whereKey($args['input']['notification_id'])
            ->where('user_id', $user->id)
            ->first();

        if (! $notification) {
            throw new UserError('Notification not found.');
        }

        if (! $notification->read_at) {
            $notification->update(['read_at' => now()]);
            $notification->refresh();
        }

        return [
            'ok' => true,
            'notification_id' => $notification->id,
            'read_at' => $notification->read_at?->toIso8601String(),
        ];
    }

}
