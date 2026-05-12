<?php

namespace App\DTOs\User;

class UpdateReviewDTO
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?string $email = null
    ) {
    }

    public function toArray(): array
    {
        return array_filter([
            'name' => $this->name,
            'email' => $this->email,
        ], static fn ($value) => $value !== null);
    }
}
