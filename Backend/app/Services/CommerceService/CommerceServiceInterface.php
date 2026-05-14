<?php

namespace App\Services\CommerceService;

interface CommerceServiceInterface
{
    public function listRestaurants(array $args): array;

    public function getRestaurantMenu(string $restaurantId): array;

    public function getUserCart(?string $userId): ?array;

    public function listUserOrders(string $userId, int $limit, bool $activeOnly): array;
}

