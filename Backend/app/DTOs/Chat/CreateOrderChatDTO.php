<?php

namespace App\DTOs\Chat;

use App\Enums\ChatType;
use Spatie\LaravelData\Data;

class CreateOrderChatDTO extends Data
{
    public function __construct(
        public readonly string $order_id,
        public readonly ChatType $type,
        public readonly array $participant_user_ids,
    ) {
    }
}
