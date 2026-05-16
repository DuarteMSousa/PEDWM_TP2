<?php

namespace App\Services\UserAddressService;

use App\DTOs\UserAddress\CreateUserAddressDTO;
use App\DTOs\UserAddress\UpdateUserAddressDTO;
use App\Models\UserAddress;

interface UserAddressServiceInterface
{
    public function forUser(string $userId);

    public function createForUser(string $userId, CreateUserAddressDTO $data): UserAddress;

    public function updateForUser(string $userId, string $addressId, UpdateUserAddressDTO $data): ?UserAddress;

    public function deleteForUser(string $userId, string $addressId): bool;

    public function setDefault(string $userId, string $addressId): ?UserAddress;
}
