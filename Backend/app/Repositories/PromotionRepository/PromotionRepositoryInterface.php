<?php

namespace App\Repositories\PromotionRepository;

use App\DTOs\Campaigns\Promotion\CreatePromotionDTO;
use App\DTOs\Campaigns\Promotion\UpdatePromotionDTO;

interface PromotionRepositoryInterface
{
    public function getById(string $id);

    public function getByIdOrFail(string $id);

    public function getByChainId(string $chainId);

    public function createPromotion(CreatePromotionDTO $data);

    public function updatePromotion(string $id, UpdatePromotionDTO $data);

    public function deletePromotion(string $id);

    public function replaceItems(string $promotionId, array $items): void;

    public function categoryBelongsToChain(string $categoryId, string $chainId): bool;

    public function productBelongsToChain(string $productId, string $chainId): bool;
}
