<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Review\CreateReviewDTO;
use App\DTOs\Review\UpdateReviewDTO;
use App\Enums\ReviewTargetType;
use App\Models\Courier;
use App\Models\Restaurant;
use App\Models\Review;
use App\Repositories\ReviewRepository\ReviewRepositoryInterface;
use App\Support\ResolvesAuthenticatedUser;
use GraphQL\Error\UserError;
use Illuminate\Support\Facades\DB;

class ReviewMutations
{
    use ResolvesAuthenticatedUser;

    public function __construct(private ReviewRepositoryInterface $reviewRepository)
    {
    }

    public function createReview(null $_, array $args): Review
    {
        $user = $this->resolveAuthenticatedUser();
        $input = $args['input'];

        $rating = (int) $input['rating'];
        if ($rating < 1 || $rating > 5) {
            throw new UserError('Rating must be between 1 and 5.');
        }

        $targetType = ReviewTargetType::from($input['target_type']);
        $targetId = (string) $input['target_id'];
        $this->assertReviewTargetExists($targetType, $targetId);

        $review = DB::transaction(function () use ($user, $input, $targetType, $targetId): Review {
            $dto = CreateReviewDTO::from([
                'user_id' => $user->id,
                'rating' => (int) $input['rating'],
                'comment' => $input['comment'] ?? null,
                'target_type' => $targetType,
                'target_id' => $targetId,
            ]);

            $createdReview = $this->reviewRepository->createReview($dto);
            $this->syncTargetRating($targetType, $targetId);

            return $createdReview;
        });

        return $review->fresh();
    }

    public function updateReview(null $_, array $args): Review
    {
        $user = $this->resolveAuthenticatedUser();
        $reviewId = (string) $args['review_id'];
        $input = $args['input'];

        /** @var Review|null $review */
        $review = $this->reviewRepository->findById($reviewId);
        if (! $review || $review->user_id !== $user->id) {
            throw new UserError('Review not found.');
        }

        if (isset($input['rating'])) {
            $rating = (int) $input['rating'];
            if ($rating < 1 || $rating > 5) {
                throw new UserError('Rating must be between 1 and 5.');
            }
        }

        $updated = DB::transaction(function () use ($review, $input) {
            $dto = UpdateReviewDTO::from([
                'rating' => isset($input['rating']) ? (int) $input['rating'] : $review->rating,
                'comment' => $input['comment'] ?? $review->comment,
            ]);

            $updatedReview = $this->reviewRepository->updateReview($review->id, $dto);
            if (! $updatedReview) {
                throw new UserError('Review not found.');
            }
            $this->syncTargetRating($review->target_type, $review->target_id);

            return $updatedReview;
        });

        return $updated->fresh();
    }

    public function deleteReview(null $_, array $args): bool
    {
        $user = $this->resolveAuthenticatedUser();
        $reviewId = (string) $args['review_id'];

        /** @var Review|null $review */
        $review = $this->reviewRepository->findById($reviewId);
        if (! $review || $review->user_id !== $user->id) {
            throw new UserError('Review not found.');
        }

        return DB::transaction(function () use ($review): bool {
            $deleted = $this->reviewRepository->deleteReview($review->id);
            if ($deleted) {
                $this->syncTargetRating($review->target_type, $review->target_id);
            }

            return $deleted;
        });
    }

    private function assertReviewTargetExists(ReviewTargetType $targetType, string $targetId): void
    {
        $exists = match ($targetType) {
            ReviewTargetType::RESTAURANT => Restaurant::query()->whereKey($targetId)->exists(),
            ReviewTargetType::COURIER => Courier::query()->whereKey($targetId)->exists(),
        };

        if (! $exists) {
            throw new UserError('Review target was not found.');
        }
    }

    private function syncTargetRating(ReviewTargetType|string $targetType, string $targetId): void
    {
        $enumType = $targetType instanceof ReviewTargetType ? $targetType : ReviewTargetType::from($targetType);

        $reviewQuery = Review::query()
            ->where('target_type', $enumType->value)
            ->where('target_id', $targetId);

        $ratingSum = (float) ($reviewQuery->sum('rating') ?? 0);
        $ratingCount = (int) ($reviewQuery->count() ?? 0);

        if ($enumType === ReviewTargetType::RESTAURANT) {
            Restaurant::query()->whereKey($targetId)->update([
                'rating_sum' => $ratingSum,
                'rating_count' => $ratingCount,
            ]);
            return;
        }

        Courier::query()->whereKey($targetId)->update([
            'rating_sum' => $ratingSum,
            'rating_count' => $ratingCount,
        ]);
    }
}
