<?php

namespace App\Services\UserService;

use App\DTOs\User\CreateUserDTO;
use App\DTOs\User\UpdateUserDTO;
use App\Repositories\UserRepository\UserRepositoryInterface;
use Illuminate\Support\Facades\DB;

class UserService implements UserServiceInterface
{
    public function __construct(private UserRepositoryInterface $userRepository) {}

    public function getById(string $id)
    {
        return $this->userRepository->findById($id);
    }

    public function createUser(CreateUserDTO $data)
    {
        return DB::transaction(function () use ($data) {
            return $this->userRepository->createUser($data->withHashedPassword());
        });
    }

    public function updateUser(string $id, UpdateUserDTO $data)
    {
        return DB::transaction(function () use ($id, $data) {
            return $this->userRepository->updateUser($id, $data);
        });
    }

    public function deleteUser(string $id)
    {
        return DB::transaction(function () use ($id) {
            return $this->userRepository->deleteUser($id);
        });
    }
}
