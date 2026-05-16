<?php

namespace App\Services\UserService;

use App\Aspects\Transactional;
use App\DTOs\User\CreateUserDTO;
use App\DTOs\User\UpdateUserDTO;
use App\Repositories\UserRepository\UserRepositoryInterface;

class UserService implements UserServiceInterface
{
    public function __construct(private UserRepositoryInterface $userRepository) {}

    public function getById(string $id)
    {
        return $this->userRepository->findById($id);
    }

    #[Transactional]
    public function createUser(CreateUserDTO $data)
    {
        return $this->userRepository->createUser($data->withHashedPassword());
    }

    #[Transactional]
    public function updateUser(string $id, UpdateUserDTO $data)
    {
        return $this->userRepository->updateUser($id, $data);
    }

    #[Transactional]
    public function deleteUser(string $id)
    {
        return $this->userRepository->deleteUser($id);
    }
}
