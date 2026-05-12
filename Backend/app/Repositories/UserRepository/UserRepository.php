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
    
    public function createUser(CreateUserDTO $data){
        return User::create($data->toArray());
    }

    public function updateUser(string $id, UpdateUserDTO $data){
        $user = User::find($id);
        if ($user) {
            $user->update($data->toArray());
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
