<?php

namespace App\DTOs\Courier;

use Carbon\CarbonInterface;

final readonly class UpdateCourierDTO
{
    public function __construct(
        public ?string $status = null,
        public ?float $latitude = null,
        public ?float $longitude = null,
        public ?CarbonInterface $lastLocationUpdate = null,
    ) {
    }
}
