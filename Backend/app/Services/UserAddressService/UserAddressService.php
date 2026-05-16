<?php

namespace App\Services\UserAddressService;

use App\Aspects\Transactional;
use App\DTOs\UserAddress\CreateUserAddressDTO;
use App\DTOs\UserAddress\UpdateUserAddressDTO;
use App\Models\UserAddress;
use Illuminate\Validation\ValidationException;

class UserAddressService implements UserAddressServiceInterface
{
    public function forUser(string $userId)
    {
        return UserAddress::query()
            ->where('user_id', $userId)
            ->orderByDesc('is_default')
            ->orderBy('label')
            ->get();
    }

    #[Transactional]
    public function createForUser(string $userId, CreateUserAddressDTO $data): UserAddress
    {
        if ($data->is_default === true) {
            $this->clearDefault($userId);
        }

        return UserAddress::query()->create([
            'user_id' => $userId,
            ...$this->createPayload($data),
        ]);
    }

    #[Transactional]
    public function updateForUser(string $userId, string $addressId, UpdateUserAddressDTO $data): ?UserAddress
    {
        $address = UserAddress::query()
            ->where('user_id', $userId)
            ->find($addressId);

        if (! $address) {
            return null;
        }

        if ($data->is_default === true) {
            $this->clearDefault($userId);
        }

        $this->validateInput([...$address->toArray(), ...array_filter($data->toArray(), static fn ($value) => $value !== null)]);
        $address->fill($this->updatePayload($data));
        $address->save();

        return $address;
    }

    #[Transactional]
    public function deleteForUser(string $userId, string $addressId): bool
    {
        return (bool) UserAddress::query()
            ->where('user_id', $userId)
            ->whereKey($addressId)
            ->delete();
    }

    #[Transactional]
    public function setDefault(string $userId, string $addressId): ?UserAddress
    {
        $address = UserAddress::query()
            ->where('user_id', $userId)
            ->find($addressId);

        if (! $address) {
            return null;
        }

        $this->clearDefault($userId);
        $address->is_default = true;
        $address->save();

        return $address;
    }

    private function clearDefault(string $userId): void
    {
        UserAddress::query()
            ->where('user_id', $userId)
            ->update(['is_default' => false]);
    }

    private function createPayload(CreateUserAddressDTO $data): array
    {
        $payload = $data->toArray();
        $this->validateInput($payload);

        return $payload;
    }

    private function updatePayload(UpdateUserAddressDTO $data): array
    {
        return array_filter($data->toArray(), static fn ($value) => $value !== null);
    }

    private function validateInput(array $input): void
    {
        $errors = [];

        foreach (['street', 'city', 'postal_code', 'country'] as $field) {
            if (empty($input[$field])) {
                $errors[$field][] = "{$field} is required.";
            }
        }

        foreach (['latitude', 'longitude'] as $field) {
            if (! isset($input[$field]) || ! is_numeric($input[$field])) {
                $errors[$field][] = "{$field} must be numeric.";
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
