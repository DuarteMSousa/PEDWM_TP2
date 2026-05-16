<?php

namespace App\GraphQL\Queries;

use App\Services\CourierService\CourierServiceInterface;
use App\Services\DeliveryService\DeliveryServiceInterface;

class DeliveryQueries
{
    public function __construct(
        private CourierServiceInterface $courierService,
        private DeliveryServiceInterface $deliveryService,
    ) {
    }

    public function courierProfile($_, array $args)
    {
        return $this->courierService->find($args['user_id']);
    }

    public function courierActiveDelivery($_, array $args)
    {
        return $this->deliveryService->activeForCourier($args['courier_id']);
    }

    public function courierDeliveries($_, array $args)
    {
        return $this->deliveryService->forCourier($args['courier_id'], $args['statuses'] ?? null);
    }

    public function delivery($_, array $args)
    {
        return $this->deliveryService->find($args['id']);
    }

    public function orderDelivery($_, array $args)
    {
        return $this->deliveryService->forOrder($args['order_id']);
    }

    public function courierDeliveryOffers($_, array $args)
    {
        return $this->deliveryService->offersForCourier($args['courier_id']);
    }
}
