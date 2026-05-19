<?php

namespace App\GraphQL\Mutations;

use App\Services\CourierService\CourierServiceInterface;
use App\Services\DeliveryService\DeliveryServiceInterface;

class DeliveryMutations
{
    public function __construct(
        private CourierServiceInterface $courierService,
        private DeliveryServiceInterface $deliveryService,
    ) {
    }

    public function setCourierStatus($_, array $args)
    {
        return $this->courierService->updateCourierStatus($args['user_id'], $args['status']);
    }

    public function acceptDeliveryOffer($_, array $args)
    {
        return $this->deliveryService->acceptDeliveryOffer($args['offer_id']);
    }

    public function rejectDeliveryOffer($_, array $args): bool
    {
        return $this->deliveryService->rejectDeliveryOffer($args['offer_id']);
    }

    public function markDeliveryPickedUp($_, array $args)
    {
        return $this->deliveryService->markDeliveryPickedUp($args['delivery_id'], $args['courier_id']);
    }

    public function markDeliveryInTransit($_, array $args)
    {
        return $this->deliveryService->markDeliveryInTransit($args['delivery_id'], $args['courier_id']);
    }

    public function markDeliveryDelivered($_, array $args)
    {
        return $this->deliveryService->markDeliveryDelivered($args['delivery_id'], $args['courier_id']);
    }

    public function markDeliveryFailed($_, array $args)
    {
        return $this->deliveryService->markDeliveryFailed($args['delivery_id'], $args['courier_id'], $args['reason']);
    }
}
