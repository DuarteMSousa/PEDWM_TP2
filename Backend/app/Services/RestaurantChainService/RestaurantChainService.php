<?php

namespace App\Services\RestaurantChainService;

use App\Aspects\Transactional;
use App\DTOs\RestaurantChain\CreateRestaurantChainDTO;
use App\DTOs\RestaurantChain\UpdateRestaurantChainDTO;
use App\Models\RestaurantChain;
use Illuminate\Validation\ValidationException;

class RestaurantChainService implements RestaurantChainServiceInterface
{
    public function getRestaurantChainById(string $id): ?RestaurantChain
    {
        return RestaurantChain::query()->find($id);
    }

    public function getAllRestaurantChains(int $limit = 100)
    {
        return RestaurantChain::query()->orderBy('name')->limit($limit)->get();
    }

    #[Transactional]
    public function createRestaurantChain(string $actorUserId, CreateRestaurantChainDTO $data): RestaurantChain
    {
        $this->validateInput($data->toArray());

        return RestaurantChain::query()->create(['name' => $data->name]);
    }

    #[Transactional]
    public function updateRestaurantChain(string $actorUserId, string $id, UpdateRestaurantChainDTO $data): ?RestaurantChain
    {
        $chain = RestaurantChain::query()->find($id);

        if (! $chain) {
            return null;
        }

        $input = array_filter($data->toArray(), static fn ($value) => $value !== null);
        $this->validateInput([...$chain->toArray(), ...$input]);
        $chain->update(['name' => $data->name ?? $chain->name]);

        return $chain;
    }

    #[Transactional]
    public function deleteRestaurantChain(string $actorUserId, string $id): bool
    {
        return (bool) RestaurantChain::query()->whereKey($id)->delete();
    }

    private function validateInput(array $input): void
    {
        if (empty($input['name'])) {
            throw ValidationException::withMessages(['name' => ['Restaurant chain name is required.']]);
        }
    }
}
