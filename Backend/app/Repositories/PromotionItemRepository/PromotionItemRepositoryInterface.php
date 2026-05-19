<?php

namespace App\Repositories\PromotionItemRepository;

use App\DTOs\Campaigns\PromotionItem\CreatePromotionItemDTO;
use App\Enums\PromotionItemParentType;

interface PromotionItemRepositoryInterface
{
    public function findById(string $id);

    public function findByParent(PromotionItemParentType|string $parentType, string $parentId);

    public function createPromotionItem(CreatePromotionItemDTO $data);

    public function deletePromotionItem(string $id);
}
