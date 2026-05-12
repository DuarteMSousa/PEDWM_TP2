<?php

namespace App\GraphQL\Queries;

use App\Services\UserService\UserServiceInterface;

class UserQueries
{
    public function __construct(private UserServiceInterface $userService)
    {
    }

    public function getById($_, array $args)
    {
        return $this->userService->getById($args['id']);
    }
}