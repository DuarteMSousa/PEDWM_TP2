<?php

namespace App\GraphQL\Mutations;

use App\Models\Notification;
use App\Models\User;
use GraphQL\Error\UserError;
use Illuminate\Auth\AuthenticationException;

class MarkNotificationRead
{
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

    private function resolveAuthenticatedUser(): User
    {
        $user = auth()->user();

        if (! $user && app()->environment(['local', 'testing'])) {
            $devUserId = request()->header('X-Dev-User-Id');
            if ($devUserId) {
                $user = User::query()->find($devUserId);
            }
        }

        if (! $user) {
            throw new AuthenticationException('Authentication required.');
        }

        return $user;
    }
}
