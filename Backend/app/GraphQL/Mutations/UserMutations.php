<?php

namespace App\GraphQL\Mutations;

use App\DTOs\User\CreateUserDTO;
use App\DTOs\User\UpdateUserDTO;
use App\DTOs\UserAddress\CreateUserAddressDTO;
use App\DTOs\UserAddress\UpdateUserAddressDTO;
use App\Enums\UserType;
use App\Services\UserAddressService\UserAddressServiceInterface;
use App\Services\UserService\UserServiceInterface;

class UserMutations
{
    public function __construct(
        private UserServiceInterface $userService,
        private UserAddressServiceInterface $userAddressService,
    ) {}

    public function createUser($_, array $args)
    {
        $input = $args['input'];

        return $this->userService->createUser(new CreateUserDTO(
            name: $input['name'],
            email: $input['email'],
            password: $input['password'],
            user_type: $input['user_type'] ?? UserType::CUSTOMER->value,
        ));
    }

    public function authenticateByCredentials($_, array $args)
    {
        return $this->userService->authenticateByCredentials(
            $args['email'],
            $args['password'],
        );
    }

    public function updateUser($_, array $args)
    {
        return $this->userService->updateUser($args['id'], new UpdateUserDTO(
            name: $args['input']['name'] ?? null,
            email: $args['input']['email'] ?? null,
        ));
    }

    public function deleteUser($_, array $args): bool
    {
        return $this->userService->deleteUser($args['id']);
    }

    public function createUserAddress($_, array $args)
    {
        return $this->userAddressService->createUserAddress($args['user_id'], CreateUserAddressDTO::from($args['input']));
    }

    public function updateUserAddress($_, array $args)
    {
        return $this->userAddressService->updateUserAddress($args['user_id'], $args['address_id'], UpdateUserAddressDTO::from($args['input']));
    }

    public function deleteUserAddress($_, array $args): bool
    {
        return $this->userAddressService->deleteUserAddress($args['user_id'], $args['address_id']);
    }

    public function setDefaultUserAddress($_, array $args)
    {
        return $this->userAddressService->setDefaultUserAddress($args['user_id'], $args['address_id']);
    }
}
