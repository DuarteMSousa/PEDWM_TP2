<?php

namespace App\DTOs\User;

use App\Enums\UserType;
use Spatie\LaravelData\Data;

class CreateUserDTO extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $password,
        public readonly string $user_type = UserType::CUSTOMER->value,
        public readonly ?string $chain_id = null,
        public readonly ?string $restaurant_id = null,
    ) {
    }

    public function withHashedPassword(): self
    {
        return new self(
            name: $this->name,
            email: $this->email,
            password: bcrypt($this->password),
            user_type: $this->user_type,
            chain_id: $this->chain_id,
            restaurant_id: $this->restaurant_id,
        );
    }
}
