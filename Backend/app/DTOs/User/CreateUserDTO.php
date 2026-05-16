<?php

namespace App\DTOs\User;

use Spatie\LaravelData\Data;

class CreateUserDTO extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $password,
        public readonly string $user_type = 'customer',
    ) {
    }

    public function withHashedPassword(): self
    {
        return new self(
            name: $this->name,
            email: $this->email,
            password: bcrypt($this->password),
            user_type: $this->user_type,
        );
    }
}
