<?php

namespace App\Repositories\UserPushTokenRepository;

use App\DTOs\Notification\RegisterPushTokenDTO;
use App\Models\UserPushToken;

class UserPushTokenRepository implements UserPushTokenRepositoryInterface
{
    public function getById(string $id): ?UserPushToken
    {
        return UserPushToken::query()->whereKey($id)->first();
    }

    public function getActiveByUserId(string $userId)
    {
        return UserPushToken::query()
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->get();
    }

    public function upsertByUserId(string $userId, RegisterPushTokenDTO $data): UserPushToken
    {
        return UserPushToken::query()->updateOrCreate(
            [
                'user_id' => $userId,
                'token' => $data->token,
            ],
            [
                'provider' => $data->provider,
                'platform' => $data->platform,
                'is_active' => true,
                'last_used_at' => now(),
            ]
        );
    }

    public function deactivateByUserIdAndToken(string $userId, string $token): int
    {
        return UserPushToken::query()
            ->where('user_id', $userId)
            ->where('token', $token)
            ->update(['is_active' => false]);
    }

    public function markUsed(UserPushToken $pushToken): UserPushToken
    {
        $pushToken->update(['last_used_at' => now()]);

        return $pushToken;
    }
}
