<?php

namespace App\Services\TrackingService;

use App\DTOs\Tracking\UpdateCourierLocationDTO;
use App\Models\CourierPositionHistory;

interface TrackingServiceInterface
{
    public function orderTracking(string $userId, string $orderId): array;

    public function deliveryTracking(string $deliveryId): array;

    public function courierLastPosition(string $courierId): ?CourierPositionHistory;

    public function updateCourierLocation(UpdateCourierLocationDTO $data): array;
}
