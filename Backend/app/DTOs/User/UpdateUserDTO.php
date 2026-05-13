<?php

namespace App\DTOs\User;

use Spatie\LaravelData\Data;

class UpdateUserDTO extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $email
    ) {
    }

}
