<?php

namespace App\DTOs\Review;

use App\Enums\ReviewTargetType;
use Spatie\LaravelData\Data;

class CreateReviewDTO extends Data
{

    public function __construct(
        public readonly string $user_id,
        public readonly int $rating,
        public readonly ?string $comment,
        public readonly ReviewTargetType $target_type,
        public readonly string $target_id
    ) {
    }

    public function toArray(): array
    {
        return [
            'user_id' => $this->user_id,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'target_type' => $this->target_type->value,
            'target_id' => $this->target_id,
        ];
    }
}
