<?php

namespace App\DTOs\User;

use Spatie\LaravelData\Data;

class UpdateUserDTO extends Data
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?string $email = null
    ) {
    }

    public function toArray(): array
    {
        return array_filter(parent::toArray(), static fn ($value) => $value !== null);
    }
}
