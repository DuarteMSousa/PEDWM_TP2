<?php

namespace App\Services\UserService;

use App\DTOs\User\CreateUserDTO;
use App\DTOs\User\UpdateUserDTO;

interface UserServiceInterface
{
    public function getById(string $id);

    public function createUser(CreateUserDTO $data);

    public function updateUser(string $id, UpdateUserDTO $data);

    public function deleteUser(string $id);
}
