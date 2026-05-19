<?php

use App\Enums\UserType;
use App\Models\ChainManager;
use App\Models\Delivery;
use App\Models\ChatParticipant;
use App\Models\LocalManager;
use App\Models\Order;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

if (! function_exists('resolveBroadcastUser')) {
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
}

Broadcast::channel('customer.{customerId}.orders', function (?User $user, string $customerId): bool {
    $user = resolveBroadcastUser($user);

    if (! $user) {
        return false;
    }

    return $user->user_type === UserType::CUSTOMER && $user->id === $customerId;
});

Broadcast::channel('courier.{courierId}.jobs', function (?User $user, string $courierId): bool {
    $user = resolveBroadcastUser($user);

    if (! $user) {
        return false;
    }

    return $user->user_type === UserType::COURIER && $user->id === $courierId;
});

Broadcast::channel('order.{orderId}.tracking', function (?User $user, string $orderId): bool {
    $user = resolveBroadcastUser($user);

    if (! $user) {
        return false;
    }

    if ($user->user_type === UserType::CUSTOMER) {
        return Order::query()
            ->whereKey($orderId)
            ->where('user_id', $user->id)
            ->exists();
    }

    if ($user->user_type === UserType::COURIER) {
        return Delivery::query()
            ->where('order_id', $orderId)
            ->where('courier_id', $user->id)
            ->exists();
    }

    if ($user->user_type === UserType::LOCAL_MANAGER) {
        return Order::query()
            ->whereKey($orderId)
            ->whereHas('restaurant.localManager', function ($query) use ($user): void {
                $query->where('user_id', $user->id);
            })
            ->exists();
    }

    if ($user->user_type === UserType::CHAIN_MANAGER) {
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

Broadcast::channel('restaurant.{restaurantId}.orders', function (?User $user, string $restaurantId): bool {
    $user = resolveBroadcastUser($user);

    if (! $user) {
        return false;
    }

    if ($user->user_type === UserType::LOCAL_MANAGER) {
        return LocalManager::query()
            ->where('user_id', $user->id)
            ->where('restaurant_id', $restaurantId)
            ->exists();
    }

    if ($user->user_type === UserType::CHAIN_MANAGER) {
        $chainId = Restaurant::query()->whereKey($restaurantId)->value('chain_id');

        if (! $chainId) {
            return false;
        }

        return ChainManager::query()
            ->where('user_id', $user->id)
            ->where('chain_id', $chainId)
            ->exists();
    }

    return false;
});
