<?php

namespace App\Services\ReviewService;

use App\DTOs\Review\CreateReviewDTO;
use App\DTOs\Review\UpdateReviewDTO;
use App\Models\Review;

interface ReviewServiceInterface
{
    public function forUser(string $userId, int $page, int $perPage);

    public function forTarget(string $targetType, string $targetId, int $page, int $perPage);

    public function create(CreateReviewDTO $data): Review;

    public function updateForUser(string $userId, string $reviewId, UpdateReviewDTO $data): ?Review;

    public function deleteForUser(string $userId, string $reviewId): bool;
}
