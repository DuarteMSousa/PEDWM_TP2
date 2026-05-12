<?php

namespace App\DTOs\Review;
use \App\Enums\ReviewTargetType;
class CreateReviewDTO
{

    public function __construct(
        public readonly string $userId,
        public readonly int $rating,
        public readonly string $comment,
        public readonly ReviewTargetType $targetType,
        public readonly string $targetId
    ) {
    }

    public function toArray(): array
    {
        return [
            "user_id" => $this->userId,
            "rating" => $this->rating,
            "comment" => $this->comment,
            "target_type" => $this->targetType->value,
            "target_id" => $this->targetId,
        ];
    }
}
