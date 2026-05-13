<?php

namespace App\Repositories\PromotionItemRepository;

use App\DTOs\Campaigns\PromotionItem\CreatePromotionItemDTO;

interface PromotionItemRepositoryInterface
{
    public function findById(string $id);

    public function findByPromotionId(string $promotionId);

    public function createPromotionItem(CreatePromotionItemDTO $data);

    public function deletePromotionItem(string $id);
}
