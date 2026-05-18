<?php

namespace App\Services\PromotionService;

use App\DTOs\Campaigns\Promotion\CreatePromotionDTO;
use App\DTOs\Campaigns\Promotion\UpdatePromotionDTO;
use App\Models\Promotion;

interface PromotionServiceInterface
{
    public function getPromotionsByChainId(string $chainId);

    public function getPromotionById(string $id): ?Promotion;

    public function createPromotion(string $actorUserId, CreatePromotionDTO $data): Promotion;

    public function updatePromotion(string $actorUserId, string $promotionId, UpdatePromotionDTO $data): Promotion;

    public function deletePromotion(string $actorUserId, string $id): bool;
}
