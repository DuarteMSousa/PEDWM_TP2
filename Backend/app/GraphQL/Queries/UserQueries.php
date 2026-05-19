<?php

namespace App\GraphQL\Queries;

use App\Services\UserAddressService\UserAddressServiceInterface;
use App\Services\UserService\UserServiceInterface;

class UserQueries
{
    public function __construct(
        private UserServiceInterface $userService,
        private UserAddressServiceInterface $userAddressService,
    ) {}

    public function getUserById($_, array $args)
    {
        return $this->userService->getUserById($args['id']);
    }

    public function getUserAddressesByUserId($_, array $args)
    {
        return $this->userAddressService->getUserAddressesByUserId($args['user_id']);
    }
}
