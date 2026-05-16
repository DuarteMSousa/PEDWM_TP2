<?php

namespace App\GraphQL\Queries;

use App\Services\UserAddressService\UserAddressServiceInterface;
use App\Services\UserService\UserServiceInterface;

class UserQueries
{
    public function __construct(
        private UserServiceInterface $userService,
        private UserAddressServiceInterface $userAddressService,
    ) {
    }

    public function getById($_, array $args)
    {
        return $this->userService->getById($args['id']);
    }

    public function clientAddresses($_, array $args)
    {
        return $this->userAddressService->forUser($args['user_id']);
    }
}
