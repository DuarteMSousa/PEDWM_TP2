<?php

namespace App\GraphQL\Queries;

use App\Services\ReviewService\ReviewServiceInterface;

class ReviewQueries
{
    public function __construct(private ReviewServiceInterface $reviewService) {}

    public function getReviewsByUserId($_, array $args)
    {
        return $this->reviewService->getReviewsByUserId($args['user_id'], $args['page'], $args['per_page']);
    }

    public function getReviewsByTarget($_, array $args)
    {
        return $this->reviewService->getReviewsByTarget($args['target_type'], $args['target_id'], $args['page'], $args['per_page']);
    }
}
