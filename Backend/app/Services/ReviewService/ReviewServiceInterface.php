<?php

namespace App\Services\ReviewService;

use App\DTOs\Review\CreateReviewDTO;
use App\DTOs\Review\UpdateReviewDTO;
use App\Models\Review;

interface ReviewServiceInterface
{
    public function getReviewsByUserId(string $userId, int $page, int $perPage);

    public function getReviewsByTarget(string $targetType, string $targetId, int $page, int $perPage);

    public function createReview(CreateReviewDTO $data): Review;

    public function updateReview(string $userId, string $reviewId, UpdateReviewDTO $data): ?Review;

    public function deleteReview(string $userId, string $reviewId): bool;
}
