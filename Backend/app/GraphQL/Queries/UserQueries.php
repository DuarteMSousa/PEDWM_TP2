<?php

namespace App\GraphQL\Queries;

use App\Models\UserAddress;
use App\Services\UserService\UserServiceInterface;
use App\Support\ResolvesAuthenticatedUser;

class UserQueries
{
    use ResolvesAuthenticatedUser;

    public function __construct(private UserServiceInterface $userService)
    {
    }

    public function getById($_, array $args)
    {
        return $this->userService->getById($args['id']);
    }

    public function me($_, array $args)
    {
        return $this->resolveAuthenticatedUser();
    }

    /**
     * @return array<int, UserAddress>
     */
    public function myAddresses($_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        return UserAddress::query()
            ->where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get()
            ->all();
    }
}
