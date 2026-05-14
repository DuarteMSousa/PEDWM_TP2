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
}
