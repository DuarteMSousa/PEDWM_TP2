<?php

namespace App\DTOs\LocalManager;

use Spatie\LaravelData\Data;

class CreateLocalManagerDTO extends Data
{
    public function __construct(
        public readonly string $user_id,
        public readonly string $restaurant_id,
    ) {
    }
}
