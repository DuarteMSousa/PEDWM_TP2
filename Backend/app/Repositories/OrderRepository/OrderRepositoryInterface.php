<?php

namespace App\Repositories\OrderRepository;

use App\DTOs\Order\CreateOrderDTO;
use App\DTOs\Order\UpdateOrderDTO;

interface OrderRepositoryInterface
{
    public function findById(string $id);

    public function findByUserId(string $userId, int $pageNumber, int $pageSize);

    public function findByRestaurantId(string $restaurantId, int $pageNumber, int $pageSize);

    public function findByUserIdWithFilters(string $userId, int $limit, ?array $statuses = null);

    public function createOrder(CreateOrderDTO $data);

    public function updateOrder(string $id, UpdateOrderDTO $data);

    public function deleteOrder(string $id);
}
