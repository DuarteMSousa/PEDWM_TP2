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
        return Promotion::with(['promotionItems'])->where('chain_id', $chainId)->get();
    }

    public function createPromotion(CreatePromotionDTO $data)
    {
        return Promotion::create([
            'chain_id' => $data->chain_id,
            'name' => $data->name,
            'description' => $data->description,
            'type' => $data->type->value,
            'target' => $data->target->value,
            'discount' => $data->discount,
            'start_date' => $data->start_date,
            'end_date' => $data->end_date,
        ]);
    }

    public function updatePromotion(string $id, UpdatePromotionDTO $data)
    {
        $promotion = Promotion::find($id);

        if (!$promotion) {
            return null;
        }

        $promotion->update(array_filter([
            'name' => $data->name,
            'description' => $data->description,
            'type' => $data->type?->value,
            'target' => $data->target?->value,
            'discount' => $data->discount,
            'start_date' => $data->start_date,
            'end_date' => $data->end_date,
        ], static fn ($value) => $value !== null));

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
