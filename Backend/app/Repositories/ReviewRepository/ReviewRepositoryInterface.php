<?php

namespace App\Repositories\ReviewRepository;
use App\DTOs\Review\CreateReviewDTO;
use App\DTOs\Review\UpdateReviewDTO;

interface ReviewRepositoryInterface
{
    public function findById(string $id);

    public function findByUserId(string $userId, int $pageNumber,int $pageSize);

    public function findByTargetEntity(string $targetEntityId,string $targetEntityType, int $pageNumber,int $pageSize);

    public function createReview(CreateReviewDTO $data);

    public function updateReview(string $id, UpdateReviewDTO $data);

    public function deleteReview(string $id);
}


