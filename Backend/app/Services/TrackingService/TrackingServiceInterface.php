<?php

namespace App\Services\TrackingService;

use App\DTOs\Tracking\UpdateCourierLocationDTO;

interface TrackingServiceInterface
{
    public function orderTracking(string $userId, string $orderId): array;

    public function deliveryTracking(string $deliveryId): array;

    public function courierLastPosition(string $courierId): ?\App\Models\CourierPositionHistory;

    public function updateCourierLocation(UpdateCourierLocationDTO $data): array;
}
