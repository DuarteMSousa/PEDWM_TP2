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

    public function availableCouriersCount()
    {
        return $this->courierService->countAvailableCouriers();
    }

    public function courierProfile($_, array $args)
    {
        return $this->courierService->getCourierByUserId($args['user_id']);
    }

    public function courierActiveDelivery($_, array $args)
    {
        return $this->deliveryService->getActiveDeliveryByCourierId($args['courier_id']);
    }

    public function courierDeliveries($_, array $args)
    {
        return $this->deliveryService->getDeliveriesByCourierId($args['courier_id'], $args['statuses'] ?? null);
    }

    public function delivery($_, array $args)
    {
        return $this->deliveryService->getDeliveryById($args['id']);
    }

    public function orderDelivery($_, array $args)
    {
        return $this->deliveryService->getDeliveryByOrderId($args['order_id']);
    }

    public function courierDeliveryOffers($_, array $args)
    {
        return $this->deliveryService->getDeliveryOffersByCourierId($args['courier_id']);
    }
}
