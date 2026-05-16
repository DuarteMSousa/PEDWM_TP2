<?php

namespace App\DTOs\Notification;

use Spatie\LaravelData\Data;

class RegisterPushTokenDTO extends Data
{
    public function __construct(
        public readonly string $token,
        public readonly string $provider = 'expo',
        public readonly ?string $platform = null,
    ) {
    }
}
