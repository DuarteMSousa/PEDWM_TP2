<?php

namespace App\Services\ReviewService;

use App\Aspects\Transactional;
use App\DTOs\Review\CreateReviewDTO;
use App\DTOs\Review\UpdateReviewDTO;
use App\Models\Review;
use Illuminate\Validation\ValidationException;

class ReviewService implements ReviewServiceInterface
{
    public function getReviewsByUserId(string $userId, int $page, int $perPage)
    {
        return Review::query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->paginate($perPage, ['*'], 'page', $page)
            ->items();
    }

    public function getReviewsByTarget(string $targetType, string $targetId, int $page, int $perPage)
    {
        return Review::query()
            ->where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->orderByDesc('created_at')
            ->paginate($perPage, ['*'], 'page', $page)
            ->items();
    }

    #[Transactional]
    public function updateReview(string $userId, string $reviewId, UpdateReviewDTO $data): ?Review
    {
        $review = Review::query()->where('user_id', $userId)->find($reviewId);

        if (! $review) {
            return null;
        }

        $input = array_filter($data->toArray(), static fn ($value) => $value !== null);
        $this->validateInput([...$review->toArray(), ...$input]);
        $review->fill(array_filter([
            'rating' => $data->rating,
            'comment' => $data->comment,
        ], static fn ($value) => $value !== null));
        $review->save();

        return $review;
    }

    #[Transactional]
    public function deleteReview(string $userId, string $reviewId): bool
    {
        return (bool) Review::query()
            ->where('user_id', $userId)
            ->whereKey($reviewId)
            ->delete();
    }

    #[Transactional]
    public function createReview(CreateReviewDTO $data): Review
    {
        $this->validateInput($data->toArray());

        return Review::query()->create([
            'user_id' => $data->user_id,
            'rating' => $data->rating,
            'comment' => $data->comment,
            'target_type' => $data->target_type->value,
            'target_id' => $data->target_id,
        ]);
    }

    private function validateInput(array $input): void
    {
        $errors = [];
        $rating = (int) ($input['rating'] ?? 0);

        if ($rating < 1 || $rating > 5) {
            $errors['rating'][] = 'Rating must be between 1 and 5.';
        }

        if (empty($input['target_type']) || ! in_array($input['target_type'], ['RESTAURANT', 'COURIER'], true)) {
            $errors['target_type'][] = 'Invalid review target type.';
        }

        if (empty($input['target_id'])) {
            $errors['target_id'][] = 'Review target id is required.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
