<?php

namespace App\GraphQL\Queries;

use App\Services\ReviewService\ReviewServiceInterface;

class ReviewQueries
{
    public function __construct(private ReviewServiceInterface $reviewService)
    {
    }

    public function clientReviews($_, array $args)
    {
        return $this->reviewService->forUser($args['user_id'], $args['page'], $args['per_page']);
    }

    public function targetReviews($_, array $args)
    {
        return $this->reviewService->forTarget($args['target_type'], $args['target_id'], $args['page'], $args['per_page']);
    }
}
