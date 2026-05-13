<?php

namespace App\Repositories\PromotionItemRepository;

use App\DTOs\Campaigns\PromotionItem\CreatePromotionItemDTO;
use App\Models\PromotionItem;

class PromotionItemRepository implements PromotionItemRepositoryInterface
{
    public function findById(string $id)
    {
        return PromotionItem::find($id);
    }

    public function findByPromotionId(string $promotionId)
    {
        return PromotionItem::where('promotion_id', $promotionId)->get();
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
