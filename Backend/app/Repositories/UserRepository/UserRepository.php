<?php

namespace App\Repositories\UserRepository;

use App\DTOs\User\CreateUserDTO;
use App\DTOs\User\UpdateUserDTO;
use App\Models\User;


class UserRepository implements UserRepositoryInterface
{
    public function findById(string $id){
        return User::find($id);
    }

    public function findByEmail(string $email)
    {
        return User::query()->where('email', $email)->first();
    }
    
    public function createUser(CreateUserDTO $data){
        return User::create([
            'name' => $data->name,
            'email' => $data->email,
            'password' => $data->password,
            'user_type' => $data->user_type,
        ]);
    }

    public function updateUser(string $id, UpdateUserDTO $data){
        $user = User::find($id);
        if ($user) {
            $user->update(array_filter($data->toArray(), static fn ($value) => $value !== null));
            return $user;
        }
        return null;
    }

    public function deleteUser(string $id){
        $user = User::find($id);
        if ($user) {
            $user->delete();
            return true;
        }
        return false;
    }
}
