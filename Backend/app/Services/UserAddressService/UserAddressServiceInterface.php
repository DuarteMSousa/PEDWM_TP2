<?php

namespace App\Services\UserAddressService;

use App\DTOs\UserAddress\CreateUserAddressDTO;
use App\DTOs\UserAddress\UpdateUserAddressDTO;
use App\Models\UserAddress;

interface UserAddressServiceInterface
{
    public function getUserAddressesByUserId(string $userId);

    public function createUserAddress(string $userId, CreateUserAddressDTO $data): UserAddress;

    public function updateUserAddress(string $userId, string $addressId, UpdateUserAddressDTO $data): ?UserAddress;

    public function deleteUserAddress(string $userId, string $addressId): bool;

    public function setDefaultUserAddress(string $userId, string $addressId): ?UserAddress;
}
