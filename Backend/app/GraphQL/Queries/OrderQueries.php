<?php

namespace App\GraphQL\Queries;

use App\Services\OrderService\OrderServiceInterface;

class OrderQueries
{
    public function __construct(private OrderServiceInterface $orderService)
    {
    }

    public function clientOrders($_, array $args)
    {
        return $this->orderService->clientOrders($args['user_id'], $args['statuses'] ?? null, $args['page'], $args['per_page']);
    }

    public function clientOrder($_, array $args)
    {
        return $this->orderService->clientOrder($args['user_id'], $args['order_id']);
    }

    public function restaurantOrders($_, array $args)
    {
        return $this->orderService->restaurantOrders($args['restaurant_id'], $args['statuses'] ?? null, $args['page'], $args['per_page']);
    }

    public function restaurantActiveOrders($_, array $args)
    {
        return $this->orderService->restaurantActiveOrders($args['restaurant_id']);
    }

    public function restaurantOrder($_, array $args)
    {
        return $this->orderService->restaurantOrder($args['restaurant_id'], $args['order_id']);
    }

    public function orderEvents($_, array $args)
    {
        return $this->orderService->events($args['order_id']);
    }
}
