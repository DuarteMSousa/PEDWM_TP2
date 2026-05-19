<?php

namespace App\GraphQL\Queries;

use App\Services\OrderService\OrderServiceInterface;

class OrderQueries
{
    public function __construct(private OrderServiceInterface $orderService) {}

    public function getClientOrders($_, array $args)
    {
        return $this->orderService->getClientOrders($args['user_id'], $args['statuses'] ?? null, $args['page'], $args['per_page']);
    }

    public function getClientOrder($_, array $args)
    {
        return $this->orderService->getClientOrder($args['user_id'], $args['order_id']);
    }

    public function getRestaurantOrders($_, array $args)
    {
        return $this->orderService->getRestaurantOrders($args['restaurant_id'], $args['statuses'] ?? null, $args['page'], $args['per_page']);
    }

    public function getActiveRestaurantOrders($_, array $args)
    {
        return $this->orderService->getActiveRestaurantOrders($args['restaurant_id']);
    }

    public function getRestaurantOrder($_, array $args)
    {
        return $this->orderService->getRestaurantOrder($args['restaurant_id'], $args['order_id']);
    }

    public function getOrderEvents($_, array $args)
    {
        return $this->orderService->getOrderEvents($args['order_id']);
    }
}
