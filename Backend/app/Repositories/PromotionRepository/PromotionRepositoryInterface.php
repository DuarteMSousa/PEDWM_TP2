<?php

namespace App\Repositories\PromotionRepository;

use App\DTOs\Campaigns\Promotion\CreatePromotionDTO;
use App\DTOs\Campaigns\Promotion\UpdatePromotionDTO;

interface PromotionRepositoryInterface
{
    public function findById(string $id);

    public function findByChainId(string $chainId);

    public function createPromotion(CreatePromotionDTO $data);

    public function updatePromotion(string $id, UpdatePromotionDTO $data);

    public function deletePromotion(string $id);
}
