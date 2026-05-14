<?php

namespace App\GraphQL\Queries;

use App\Enums\ReviewTargetType;
use App\Models\Review;
use App\Support\ResolvesAuthenticatedUser;

class ReviewQueries
{
    use ResolvesAuthenticatedUser;

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, Review>
     */
    public function myReviews(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $page = max(1, (int) ($args['page'] ?? 1));
        $perPage = max(1, min((int) ($args['per_page'] ?? 20), 100));

        return Review::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate($perPage, ['*'], 'page', $page)
            ->items();
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, Review>
     */
    public function targetReviews(null $_, array $args): array
    {
        $page = max(1, (int) ($args['page'] ?? 1));
        $perPage = max(1, min((int) ($args['per_page'] ?? 20), 100));

        return Review::query()
            ->where('target_type', ReviewTargetType::from($args['target_type'])->value)
            ->where('target_id', $args['target_id'])
            ->orderByDesc('created_at')
            ->paginate($perPage, ['*'], 'page', $page)
            ->items();
    }
}
