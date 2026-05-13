<?php

namespace App\DTOs\Cart;

use Spatie\LaravelData\Data;

class CreateCartDTO extends Data
{

    public function __construct(
        public readonly string $user_id,
    ) {
    }

}
