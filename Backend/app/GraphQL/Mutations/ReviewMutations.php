<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Review\CreateReviewDTO;
use App\DTOs\Review\UpdateReviewDTO;
use App\Services\ReviewService\ReviewServiceInterface;

class ReviewMutations
{
    public function __construct(private ReviewServiceInterface $reviewService)
    {
    }

    public function createReview($_, array $args)
    {
        return $this->reviewService->create(CreateReviewDTO::from($args['input']));
    }

    public function updateReview($_, array $args)
    {
        return $this->reviewService->updateForUser($args['user_id'], $args['review_id'], UpdateReviewDTO::from($args['input']));
    }

    public function deleteReview($_, array $args): bool
    {
        return $this->reviewService->deleteForUser($args['user_id'], $args['review_id']);
    }
}
