<?php

namespace App\GraphQL\Mutations;

use App\Models\UserPushToken;
use App\Support\ResolvesAuthenticatedUser;

class RegisterPushToken
{
    use ResolvesAuthenticatedUser;

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $input = $args['input'];

        $pushToken = UserPushToken::query()->updateOrCreate(
            ['token' => $input['token']],
            [
                'user_id' => $user->id,
                'provider' => strtolower((string) ($input['provider'] ?? 'expo')),
                'platform' => $input['platform'] ?? null,
                'is_active' => true,
            ]
        );

        return [
            'ok' => true,
            'push_token_id' => $pushToken->id,
            'is_active' => (bool) $pushToken->is_active,
        ];
    }
}

