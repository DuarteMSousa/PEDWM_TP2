<?php

namespace App\Services\UserService;

use App\Aspects\Transactional;
use App\DTOs\User\CreateUserDTO;
use App\DTOs\User\UpdateUserDTO;
use App\Repositories\UserRepository\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserService implements UserServiceInterface
{
    public function __construct(private UserRepositoryInterface $userRepository) {}

    public function getUserById(string $id)
    {
        return $this->userRepository->findById($id);
    }

    public function authenticateByCredentials(string $email, string $password)
    {
        $user = $this->userRepository->findByEmail($email);

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'credentials' => ['Email ou password invalidos.'],
            ]);
        }

        return $user;
    }

    #[Transactional]
    public function createUser(CreateUserDTO $data)
    {
        if ($this->userRepository->findByEmail($data->email)) {
            throw ValidationException::withMessages([
                'email' => ['Este email ja esta registado.'],
            ]);
        }

        $user = $this->userRepository->createUser($data->withHashedPassword());

        return $user;
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
