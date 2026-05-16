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
    ) {
    }

    public function create($_, array $args)
    {
        $input = $args['input'];

        return $this->userService->createUser(new CreateUserDTO(
            name: $input['name'],
            email: $input['email'],
            password: $input['password'],
            user_type: $input['user_type'] ?? UserType::CUSTOMER->value,
        ));
    }

    public function update($_, array $args)
    {
        return $this->userService->updateUser($args['id'], new UpdateUserDTO(
            name: $args['input']['name'] ?? null,
            email: $args['input']['email'] ?? null,
        ));
    }

    public function delete($_, array $args): bool
    {
        return $this->userService->deleteUser($args['id']);
    }

    public function createClientAddress($_, array $args)
    {
        return $this->userAddressService->createForUser($args['user_id'], CreateUserAddressDTO::from($args['input']));
    }

    public function updateClientAddress($_, array $args)
    {
        return $this->userAddressService->updateForUser($args['user_id'], $args['address_id'], UpdateUserAddressDTO::from($args['input']));
    }

    public function deleteClientAddress($_, array $args): bool
    {
        return $this->userAddressService->deleteForUser($args['user_id'], $args['address_id']);
    }

    public function setDefaultClientAddress($_, array $args)
    {
        return $this->userAddressService->setDefault($args['user_id'], $args['address_id']);
    }
}
