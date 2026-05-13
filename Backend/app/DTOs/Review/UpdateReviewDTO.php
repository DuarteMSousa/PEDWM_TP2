<?php

namespace App\DTOs\Review;

use Spatie\LaravelData\Data;

class UpdateReviewDTO extends Data
{
    public function __construct(
        public readonly ?int $rating = null,
        public readonly ?string $comment = null
    ) {
    }

    public function toArray(): array
    {
        return array_filter(parent::toArray(), static fn ($value) => $value !== null);
    }
}
