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
        return $this->courierService->setStatus($args['user_id'], $args['status']);
    }

    public function createDeliveryForOrder($_, array $args)
    {
        return $this->deliveryService->createForOrder($args['order_id'], (float) ($args['delivery_fee'] ?? 0));
    }

    public function offerDeliveryToCourier($_, array $args)
    {
        return $this->deliveryService->offerToCourier($args['input']['delivery_id'], $args['input']['courier_id']);
    }

    public function acceptDeliveryOffer($_, array $args)
    {
        return $this->deliveryService->acceptOffer($args['delivery_id'], $args['courier_id']);
    }

    public function rejectDeliveryOffer($_, array $args): bool
    {
        return $this->deliveryService->rejectOffer($args['delivery_id'], $args['courier_id']);
    }

    public function markDeliveryPickedUp($_, array $args)
    {
        return $this->deliveryService->markPickedUp($args['delivery_id'], $args['courier_id']);
    }

    public function markDeliveryInTransit($_, array $args)
    {
        return $this->deliveryService->markInTransit($args['delivery_id'], $args['courier_id']);
    }

    public function markDeliveryDelivered($_, array $args)
    {
        return $this->deliveryService->markDelivered($args['delivery_id'], $args['courier_id']);
    }

    public function markDeliveryFailed($_, array $args)
    {
        return $this->deliveryService->markFailed($args['delivery_id'], $args['courier_id'], $args['reason']);
    }
}
