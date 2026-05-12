<?php

namespace App\Repositories\ReviewRepository;

use App\Models\Review;
use App\DTOs\Review\CreateReviewDTO;
use App\DTOs\Review\UpdateReviewDTO;

class ReviewRepository implements ReviewRepositoryInterface
{
    public function findById(string $id)
    {
        return Review::find($id);
    }

    public function findByUserId(string $userId, int $pageNumber, int $pageSize)
    {
        return Review::where("user_id", $userId)
            ->paginate($pageSize, ['*'], 'page', $pageNumber);
    }

    public function findByTargetEntity(string $targetEntityId, string $targetEntityType, int $pageNumber, int $pageSize)
    {
        return Review::where("target_entity_id", $targetEntityId)
            ->where("target_entity_type", $targetEntityType)
            ->paginate($pageSize, ['*'], 'page', $pageNumber);
    }

    public function createReview(CreateReviewDTO $data)
    {
        return Review::create($data->toArray());
    }

    public function updateReview(string $id, UpdateReviewDTO $data)
    {
        $review = Review::find($id);
        if ($review) {
            $review->update($data->toArray());
            return $review;
        }
        return null;
    }

    public function deleteReview(string $id)
    {
        $review = Review::find($id);
        if ($review) {
            $review->delete();
            return true;
        }
        return false;
    }
}
