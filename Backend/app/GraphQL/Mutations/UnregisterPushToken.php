<?php

namespace App\GraphQL\Mutations;

use App\Models\UserPushToken;
use App\Support\ResolvesAuthenticatedUser;

class UnregisterPushToken
{
    use ResolvesAuthenticatedUser;

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $token = (string) $args['input']['token'];

        UserPushToken::query()
            ->where('user_id', $user->id)
            ->where('token', $token)
            ->update(['is_active' => false]);

        return ['ok' => true];
    }
}

