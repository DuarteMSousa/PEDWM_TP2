<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Tracking\UpdateCourierLocationDTO;
use App\Services\TrackingService\TrackingServiceInterface;

class TrackingMutations
{
    public function __construct(private TrackingServiceInterface $trackingService) {}

    public function updateCourierLocation($_, array $args): array
    {
        return $this->trackingService->updateCourierLocation(UpdateCourierLocationDTO::from($args['input']));
    }
}
