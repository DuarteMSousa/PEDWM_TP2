<?php

namespace App\GraphQL\Queries;

use App\Services\TrackingService\TrackingServiceInterface;

class TrackingQueries
{
    public function __construct(private TrackingServiceInterface $trackingService) {}

    public function orderTracking($_, array $args): array
    {
        return $this->trackingService->orderTracking($args['user_id'], $args['order_id']);
    }

    public function deliveryTracking($_, array $args): array
    {
        return $this->trackingService->deliveryTracking($args['delivery_id']);
    }

    public function courierLastPosition($_, array $args)
    {
        return $this->trackingService->courierLastPosition($args['courier_id']);
    }
}
