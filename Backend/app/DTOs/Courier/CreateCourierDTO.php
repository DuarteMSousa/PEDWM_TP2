<?php

namespace App\DTOs\Courier;

use App\Enums\CourierStatus;
use Spatie\LaravelData\Data;

class CreateCourierDTO extends Data
{
    public function __construct(
        public readonly string $user_id,
        public readonly CourierStatus $status = CourierStatus::OFFLINE,
        public readonly ?float $latitude = null,
        public readonly ?float $longitude = null,
        public readonly ?string $last_location_update = null,
    ) {
    }

    public function toArray(): array
    {
        return [
            'user_id' => $this->user_id,
            'status' => $this->status->value,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'last_location_update' => $this->last_location_update,
        ];
    }
}
