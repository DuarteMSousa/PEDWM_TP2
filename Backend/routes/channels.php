<?php

use App\Models\Delivery;
use App\Models\ChatParticipant;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

function resolveBroadcastUser(?User $user): ?User
{
    if ($user) {
        return $user;
    }

    if (! app()->environment(['local', 'testing'])) {
        return null;
    }

    $devUserId = request()->header('X-Dev-User-Id');

    if (! $devUserId) {
        return null;
    }

    return User::query()->find($devUserId);
}

Broadcast::channel('customer.{customerId}.orders', function (?User $user, string $customerId): bool {
    $user = resolveBroadcastUser($user);

    if (! $user) {
        return false;
    }

    return $user->user_type === 'customer' && $user->id === $customerId;
});

Broadcast::channel('courier.{courierId}.jobs', function (?User $user, string $courierId): bool {
    $user = resolveBroadcastUser($user);

    if (! $user) {
        return false;
    }

    return $user->user_type === 'courier' && $user->id === $courierId;
});

Broadcast::channel('order.{orderId}.tracking', function (?User $user, string $orderId): bool {
    $user = resolveBroadcastUser($user);

    if (! $user) {
        return false;
    }

    if ($user->user_type === 'customer') {
        return Order::query()
            ->whereKey($orderId)
            ->where('user_id', $user->id)
            ->exists();
    }

    if ($user->user_type === 'courier') {
        return Delivery::query()
            ->where('order_id', $orderId)
            ->where('courier_id', $user->id)
            ->exists();
    }

    if ($user->user_type === 'local_manager') {
        return Order::query()
            ->whereKey($orderId)
            ->whereHas('restaurant.localManager', function ($query) use ($user): void {
                $query->where('user_id', $user->id);
            })
            ->exists();
    }

    if ($user->user_type === 'chain_manager') {
        return Order::query()
            ->whereKey($orderId)
            ->whereHas('restaurant.chain', function ($query) use ($user): void {
                $query->whereHas('chainManagers', function ($innerQuery) use ($user): void {
                    $innerQuery->where('user_id', $user->id);
                });
            })
            ->exists();
    }

    return false;
});

Broadcast::channel('chat.{chatId}', function (?User $user, string $chatId): bool {
    $user = resolveBroadcastUser($user);

    if (! $user) {
        return false;
    }

    return ChatParticipant::query()
        ->where('chat_id', $chatId)
        ->where('user_id', $user->id)
        ->exists();
});

Broadcast::channel('user.{userId}.notifications', function (?User $user, string $userId): bool {
    $user = resolveBroadcastUser($user);

    if (! $user) {
        return false;
    }

    return $user->id === $userId;
});
