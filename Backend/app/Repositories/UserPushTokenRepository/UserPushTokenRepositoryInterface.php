<?php

namespace App\Repositories\UserPushTokenRepository;

use App\DTOs\Notification\RegisterPushTokenDTO;
use App\Models\UserPushToken;

interface UserPushTokenRepositoryInterface
{
    public function getById(string $id): ?UserPushToken;

    public function getActiveByUserId(string $userId);

    public function upsertByUserId(string $userId, RegisterPushTokenDTO $data): UserPushToken;

    public function deactivateByUserIdAndToken(string $userId, string $token): int;

    public function markUsed(UserPushToken $pushToken): UserPushToken;
}
