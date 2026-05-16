<?php

namespace App\DTOs\Chat;

use Spatie\LaravelData\Data;

class SendMessageDTO extends Data
{
    public function __construct(
        public readonly string $chat_id,
        public readonly string $content,
    ) {
    }
}
