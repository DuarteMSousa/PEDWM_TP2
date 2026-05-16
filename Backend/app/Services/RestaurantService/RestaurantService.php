<?php

namespace App\Services\RestaurantService;

use App\DTOs\Restaurant\CreateRestaurantDTO;
use App\DTOs\Restaurant\SearchRestaurantsDTO;
use App\DTOs\Restaurant\UpdateRestaurantDTO;
use App\Models\LocalManager;
use App\Models\Restaurant;
use App\Models\RestaurantChain;
use App\Repositories\RestaurantRepository\RestaurantRepositoryInterface;
use Illuminate\Validation\ValidationException;

class RestaurantService implements RestaurantServiceInterface
{
    private array $with = ['chain', 'address'];

    public function __construct(private RestaurantRepositoryInterface $restaurantRepository)
    {
    }

    public function search(SearchRestaurantsDTO $filters)
    {
        return $this->restaurantRepository->searchRestaurants($filters)->items();
    }

    public function find(string $id): ?Restaurant
    {
        return Restaurant::query()->with($this->with)->find($id);
    }

    public function create(string $actorUserId, CreateRestaurantDTO $data): Restaurant
    {
        $this->validateInput($data->toArray());

        return Restaurant::query()->create([
            'chain_id' => $data->chain_id,
            'name' => $data->name,
            'opening_hours' => $data->opening_hours,
            'closing_hours' => $data->closing_hours,
            'delivery_radius' => $data->delivery_radius,
        ])->load($this->with);
    }

    public function update(string $actorUserId, string $id, UpdateRestaurantDTO $data): ?Restaurant
    {
        $restaurant = Restaurant::query()->find($id);

        if (! $restaurant) {
            return null;
        }

        $input = array_filter($data->toArray(), static fn ($value) => $value !== null);
        $this->validateInput([...$restaurant->toArray(), ...$input], true);
        $restaurant->update(array_filter([
            'chain_id' => $data->chain_id,
            'name' => $data->name,
            'opening_hours' => $data->opening_hours,
            'closing_hours' => $data->closing_hours,
            'delivery_radius' => $data->delivery_radius,
        ], static fn ($value) => $value !== null));

        return $restaurant->load($this->with);
    }

    public function delete(string $actorUserId, string $id): bool
    {
        return (bool) Restaurant::query()->whereKey($id)->delete();
    }

    public function forChain(string $chainId)
    {
        return Restaurant::query()
            ->with($this->with)
            ->where('chain_id', $chainId)
            ->orderBy('name')
            ->get();
    }

    public function forLocalManager(string $userId): ?Restaurant
    {
        $manager = LocalManager::query()->where('user_id', $userId)->first();

        return $manager?->restaurant()->with($this->with)->first();
    }

    private function validateInput(array $input, bool $isUpdate = false): void
    {
        $errors = [];

        foreach (['name', 'opening_hours', 'closing_hours'] as $field) {
            if (empty($input[$field])) {
                $errors[$field][] = "{$field} is required.";
            }
        }

        if (empty($input['chain_id']) || ! RestaurantChain::query()->whereKey($input['chain_id'])->exists()) {
            $errors['chain_id'][] = 'Restaurant chain does not exist.';
        }

        if (! isset($input['delivery_radius']) || (float) $input['delivery_radius'] < 0) {
            $errors['delivery_radius'][] = 'Delivery radius must be greater than or equal to zero.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
