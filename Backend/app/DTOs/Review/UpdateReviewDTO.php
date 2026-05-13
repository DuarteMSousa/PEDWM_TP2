<?php

namespace App\DTOs\Review;

use Spatie\LaravelData\Data;

class UpdateReviewDTO extends Data
{
    public function __construct(
        public readonly int $rating,
        public readonly string $comment 
    ) {
    }

}
