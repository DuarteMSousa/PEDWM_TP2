<?php

namespace App\Repositories\RestaurantRepository;

use App\DTOs\Restaurant\SearchRestaurantsDTO;
use App\DTOs\Restaurant\CreateRestaurantDTO;
use App\DTOs\Restaurant\UpdateRestaurantDTO;
use App\Models\Restaurant;

class RestaurantRepository implements RestaurantRepositoryInterface
{
    public function findById(string $id)
    {
        return Restaurant::find($id);
    }

    public function searchRestaurants(SearchRestaurantsDTO $filters)
    {
        $query = Restaurant::query()->with(['chain', 'address']);

        $q = $filters->q;
        if ($q !== '') {
            $query->where(function ($subQuery) use ($q) {
                $subQuery->where('name', 'like', "%{$q}%")
                    ->orWhereHas('chain', function ($chainQuery) use ($q) {
                        $chainQuery->where('name', 'like', "%{$q}%");
                    })
                    ->orWhereHas('address', function ($addressQuery) use ($q) {
                        $addressQuery->where('city', 'like', "%{$q}%")
                            ->orWhere('street', 'like', "%{$q}%")
                            ->orWhere('country', 'like', "%{$q}%")
                            ->orWhere('postal_code', 'like', "%{$q}%");
                    });
            });
        }

        $restaurantName = $filters->name;
        if ($restaurantName !== '') {
            $query->where('name', 'like', "%{$restaurantName}%");
        }

        $chainName = $filters->chainName;
        if ($chainName !== '') {
            $query->whereHas('chain', function ($chainQuery) use ($chainName) {
                $chainQuery->where('name', 'like', "%{$chainName}%");
            });
        }

        $city = $filters->city;
        if ($city !== '') {
            $query->whereHas('address', function ($addressQuery) use ($city) {
                $addressQuery->where('city', 'like', "%{$city}%");
            });
        }

        $country = $filters->country;
        if ($country !== '') {
            $query->whereHas('address', function ($addressQuery) use ($country) {
                $addressQuery->where('country', 'like', "%{$country}%");
            });
        }

        $postalCode = $filters->postalCode;
        if ($postalCode !== '') {
            $query->whereHas('address', function ($addressQuery) use ($postalCode) {
                $addressQuery->where('postal_code', 'like', "%{$postalCode}%");
            });
        }

        $pageNumber = $filters->pageNumber;
        $pageSize = $filters->pageSize;

        return $query
            ->orderBy('name')
            ->paginate($pageSize, ['*'], 'page', $pageNumber);
    }

    

    public function createRestaurant(CreateRestaurantDTO $data)
    {
        return Restaurant::create($data->toArray());
    }

    public function updateRestaurant(string $id, UpdateRestaurantDTO $data)
    {
        $restaurant = Restaurant::find($id);
        if ($restaurant) {
            $restaurant->update($data->toArray());
            return $restaurant;
        }
        return null;
    }

    public function deleteRestaurant(string $id)
    {
        $restaurant = Restaurant::find($id);
        if ($restaurant) {
            $restaurant->delete();
            return true;
        }
        return false;
    }
}
