<?php

namespace App\Repositories\PromotionRepository;

use App\DTOs\Campaigns\Promotion\CreatePromotionDTO;
use App\DTOs\Campaigns\Promotion\UpdatePromotionDTO;
use App\Models\Promotion;

class PromotionRepository implements PromotionRepositoryInterface
{
    public function findById(string $id)
    {
        return Promotion::with(['promotionItems'])->find($id);
    }

    public function findByChainId(string $chainId)
    {
        return Promotion::where('chain_id', $chainId)->get();
    }

    public function createPromotion(CreatePromotionDTO $data)
    {
        return Promotion::create($data->toArray());
    }

    public function updatePromotion(string $id, UpdatePromotionDTO $data)
    {
        $promotion = Promotion::find($id);

        if (!$promotion) {
            return null;
        }

        $promotion->update($data->toArray());

        return $promotion;
    }

    public function deletePromotion(string $id)
    {
        $promotion = Promotion::find($id);

        if (!$promotion) {
            return false;
        }

        $promotion->delete();

        return true;
    }
}
