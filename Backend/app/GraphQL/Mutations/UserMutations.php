<?php

namespace App\GraphQL\Mutations;

use App\Services\UserService\UserServiceInterface;
use App\DTOs\User\CreateUserDTO;
use App\DTOs\User\UpdateUserDTO;

class UserMutations
{
    public function __construct(private UserServiceInterface $userService)
    {
    }

    public function create($_, array $args)
    {
        $dto = CreateUserDTO::from($args['input']);

        return $this->userService->createUser($dto);
    }

    public function update($_, array $args)
    {
        $dto = UpdateUserDTO::from($args['input']);

        return $this->userService->updateUser($args['id'], $dto);
    }

    public function delete($_, array $args)
    {
        $this->userService->deleteUser($args['id']);
        return true;
    }
}
