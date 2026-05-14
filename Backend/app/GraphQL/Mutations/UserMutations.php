<?php

namespace App\GraphQL\Mutations;

use App\Services\UserService\UserServiceInterface;
use App\DTOs\User\CreateUserDTO;
use App\DTOs\User\UpdateUserDTO;
use App\Models\UserAddress;
use App\Support\ResolvesAuthenticatedUser;
use GraphQL\Error\UserError;
use Illuminate\Support\Facades\DB;

class UserMutations
{
    use ResolvesAuthenticatedUser;

    public function __construct(private UserServiceInterface $userService)
    {
    }

    public function create($_, array $args)
    {
        $dto = CreateUserDTO::from($args['input']);

        return $this->userService->createUser($dto);
    }

    public function update($_, array $args)
    {
        $dto = UpdateUserDTO::from($args['input']);

        return $this->userService->updateUser($args['id'], $dto);
    }

    public function delete($_, array $args)
    {
        $this->userService->deleteUser($args['id']);
        return true;
    }

    public function updateMyProfile($_, array $args)
    {
        $user = $this->resolveAuthenticatedUser();
        $dto = UpdateUserDTO::from($args['input']);

        return $this->userService->updateUser($user->id, $dto);
    }

    public function createMyAddress($_, array $args)
    {
        $user = $this->resolveAuthenticatedUser();
        $input = $args['input'];
        $isDefault = (bool) ($input['is_default'] ?? false);

        return DB::transaction(function () use ($user, $input, $isDefault) {
            if ($isDefault) {
                UserAddress::query()->where('user_id', $user->id)->update(['is_default' => false]);
            } else {
                $hasAnyAddress = UserAddress::query()->where('user_id', $user->id)->exists();
                if (! $hasAnyAddress) {
                    $isDefault = true;
                }
            }

            return UserAddress::query()->create([
                'user_id' => $user->id,
                'street' => $input['street'],
                'city' => $input['city'],
                'postal_code' => $input['postal_code'],
                'country' => $input['country'],
                'latitude' => (float) $input['latitude'],
                'longitude' => (float) $input['longitude'],
                'is_default' => $isDefault,
                'label' => $input['label'] ?? null,
            ]);
        });
    }

    public function updateMyAddress($_, array $args)
    {
        $user = $this->resolveAuthenticatedUser();
        $addressId = (string) $args['address_id'];
        $input = $args['input'];

        /** @var UserAddress|null $address */
        $address = UserAddress::query()
            ->whereKey($addressId)
            ->where('user_id', $user->id)
            ->first();

        if (! $address) {
            throw new UserError('Address not found.');
        }

        return DB::transaction(function () use ($user, $address, $input) {
            if (array_key_exists('is_default', $input) && (bool) $input['is_default']) {
                UserAddress::query()->where('user_id', $user->id)->update(['is_default' => false]);
            }

            $address->update(array_filter([
                'street' => $input['street'] ?? null,
                'city' => $input['city'] ?? null,
                'postal_code' => $input['postal_code'] ?? null,
                'country' => $input['country'] ?? null,
                'latitude' => isset($input['latitude']) ? (float) $input['latitude'] : null,
                'longitude' => isset($input['longitude']) ? (float) $input['longitude'] : null,
                'is_default' => $input['is_default'] ?? null,
                'label' => $input['label'] ?? null,
            ], fn ($value) => $value !== null));

            return $address->fresh();
        });
    }

    public function deleteMyAddress($_, array $args): bool
    {
        $user = $this->resolveAuthenticatedUser();
        $addressId = (string) $args['address_id'];

        /** @var UserAddress|null $address */
        $address = UserAddress::query()
            ->whereKey($addressId)
            ->where('user_id', $user->id)
            ->first();

        if (! $address) {
            throw new UserError('Address not found.');
        }

        DB::transaction(function () use ($user, $address): void {
            $wasDefault = (bool) $address->is_default;
            $address->delete();

            if ($wasDefault) {
                $fallback = UserAddress::query()
                    ->where('user_id', $user->id)
                    ->orderBy('created_at')
                    ->first();

                if ($fallback) {
                    $fallback->update(['is_default' => true]);
                }
            }
        });

        return true;
    }

    public function setDefaultMyAddress($_, array $args)
    {
        $user = $this->resolveAuthenticatedUser();
        $addressId = (string) $args['address_id'];

        /** @var UserAddress|null $address */
        $address = UserAddress::query()
            ->whereKey($addressId)
            ->where('user_id', $user->id)
            ->first();

        if (! $address) {
            throw new UserError('Address not found.');
        }

        DB::transaction(function () use ($user, $address): void {
            UserAddress::query()->where('user_id', $user->id)->update(['is_default' => false]);
            $address->update(['is_default' => true]);
        });

        return $address->fresh();
    }
}
