<?php

namespace App\DTOs\Chat;

use Spatie\LaravelData\Data;

class AddChatParticipantDTO extends Data
{
    public function __construct(
        public readonly string $chat_id,
        public readonly string $user_id,
        public readonly string $user_type,
    ) {
    }
}
