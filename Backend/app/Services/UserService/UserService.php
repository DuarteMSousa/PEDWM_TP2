<?php

namespace App\Services\UserService;

use App\Aspects\Transactional;
use App\DTOs\User\CreateUserDTO;
use App\DTOs\User\UpdateUserDTO;
use App\Enums\UserType;
use App\Models\ChainManager;
use App\Models\LocalManager;
use App\Models\Restaurant;
use App\Models\RestaurantAddress;
use App\Models\RestaurantChain;
use App\Models\User;
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
        $this->provisionOperatorAssociations($user, $data);

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

    private function provisionOperatorAssociations(User $user, CreateUserDTO $data): void
    {
        $type = UserType::tryFrom($data->user_type);
        if (! $type) {
            return;
        }

        if ($type === UserType::CHAIN_MANAGER) {
            $chain = $this->resolveOrCreateChain($data->chain_id, $user->name);
            ChainManager::query()->updateOrCreate(
                ['user_id' => $user->id],
                ['chain_id' => $chain->id],
            );

            $restaurant = $this->resolveOrCreateRestaurant(
                chainId: $chain->id,
                restaurantId: $data->restaurant_id,
                ownerName: $user->name,
            );

            LocalManager::query()->updateOrCreate(
                ['user_id' => $user->id],
                ['restaurant_id' => $restaurant->id],
            );
        }

        if ($type === UserType::LOCAL_MANAGER) {
            $restaurant = $this->resolveOrCreateRestaurant(
                chainId: $data->chain_id,
                restaurantId: $data->restaurant_id,
                ownerName: $user->name,
            );

            LocalManager::query()->updateOrCreate(
                ['user_id' => $user->id],
                ['restaurant_id' => $restaurant->id],
            );
        }
    }

    private function resolveOrCreateChain(?string $chainId, string $ownerName): RestaurantChain
    {
        if ($chainId) {
            $chain = RestaurantChain::query()->find($chainId);
            if (! $chain) {
                throw ValidationException::withMessages([
                    'chain_id' => ['A cadeia indicada nao existe.'],
                ]);
            }

            return $chain;
        }

        return RestaurantChain::query()->create([
            'name' => "Chain {$ownerName}",
        ]);
    }

    private function resolveOrCreateRestaurant(?string $chainId, ?string $restaurantId, string $ownerName): Restaurant
    {
        if ($chainId && ! RestaurantChain::query()->whereKey($chainId)->exists()) {
            throw ValidationException::withMessages([
                'chain_id' => ['A cadeia indicada nao existe.'],
            ]);
        }

        if ($restaurantId) {
            $restaurant = Restaurant::query()->find($restaurantId);
            if (! $restaurant) {
                throw ValidationException::withMessages([
                    'restaurant_id' => ['O restaurante indicado nao existe.'],
                ]);
            }

            if ($chainId && $restaurant->chain_id !== $chainId) {
                throw ValidationException::withMessages([
                    'restaurant_id' => ['O restaurante indicado nao pertence a cadeia escolhida.'],
                ]);
            }

            return $restaurant;
        }

        $effectiveChainId = $chainId
            ?? Restaurant::query()->orderByDesc('created_at')->value('chain_id')
            ?? $this->resolveOrCreateChain(null, $ownerName)->id;

        $restaurant = Restaurant::query()->create([
            'chain_id' => $effectiveChainId,
            'name' => "Rest {$ownerName}",
            'opening_hours' => '09:00',
            'closing_hours' => '23:00',
            'delivery_radius' => 7,
        ]);

        RestaurantAddress::query()->create([
            'restaurant_id' => $restaurant->id,
            'street' => 'Rua Principal 1',
            'city' => 'Lisboa',
            'postal_code' => '1000-001',
            'country' => 'PT',
            'latitude' => 38.7223,
            'longitude' => -9.1393,
        ]);

        return $restaurant;
    }
}
