<?php

namespace App\Repositories\PromotionItemRepository;

use App\DTOs\Campaigns\PromotionItem\CreatePromotionItemDTO;
use App\Enums\PromotionItemParentType;
use App\Models\PromotionItem;

class PromotionItemRepository implements PromotionItemRepositoryInterface
{
    public function findById(string $id)
    {
        return PromotionItem::find($id);
    }

    public function findByParent(PromotionItemParentType|string $parentType, string $parentId)
    {
        $parentType = $parentType instanceof PromotionItemParentType ? $parentType->value : $parentType;

        return PromotionItem::where('parent_type', $parentType)
            ->where('parent_id', $parentId)
            ->get();
    }

    public function createPromotionItem(CreatePromotionItemDTO $data)
    {
        return PromotionItem::create($data->toArray());
    }

    public function deletePromotionItem(string $id)
    {
        $promotionItem = PromotionItem::find($id);

        if (!$promotionItem) {
            return false;
        }

        $promotionItem->delete();

        return true;
    }
}
