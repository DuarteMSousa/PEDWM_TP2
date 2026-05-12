<?php

namespace App\Repositories\UserRepository;

use App\DTOs\User\CreateUserDTO;
use App\DTOs\User\UpdateUserDTO;

interface UserRepositoryInterface
{
    public function findById(string $id);

    public function createUser(CreateUserDTO $data);

    public function updateUser(string $id, UpdateUserDTO $data);

    public function deleteUser(string $id);
}


