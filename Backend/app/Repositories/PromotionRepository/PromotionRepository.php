<?php

namespace App\Repositories\PromotionRepository;

use App\DTOs\Campaigns\Promotion\CreatePromotionDTO;
use App\DTOs\Campaigns\Promotion\UpdatePromotionDTO;
use App\Models\Category;
use App\Models\Product;
use App\Models\Promotion;

class PromotionRepository implements PromotionRepositoryInterface
{
    public function getById(string $id)
    {
        return Promotion::with(['promotionItems'])->find($id);
    }

    public function getByIdOrFail(string $id)
    {
        return Promotion::with(['promotionItems'])->findOrFail($id);
    }

    public function getByChainId(string $chainId)
    {
        return Promotion::with(['promotionItems'])
            ->where('chain_id', $chainId)
            ->orderByDesc('created_at')
            ->get();
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

        return $promotion->load(['promotionItems']);
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

    public function replaceItems(string $promotionId, array $items): void
    {
        $promotion = Promotion::with(['promotionItems'])->findOrFail($promotionId);
        $keptIds = [];

        foreach ($items as $item) {
            $payload = [
                'item_id' => $item['item_id'],
            ];

            if (! empty($item['id'])) {
                $promotionItem = $promotion->promotionItems()->whereKey($item['id'])->first();

                if ($promotionItem) {
                    $promotionItem->update($payload);
                } else {
                    $promotionItem = $promotion->promotionItems()->create($payload);
                }
            } else {
                $promotionItem = $promotion->promotionItems()->create($payload);
            }

            $keptIds[] = $promotionItem->id;
        }

        if ($items === []) {
            $promotion->promotionItems()->delete();

            return;
        }

        $promotion->promotionItems()->whereNotIn('id', $keptIds)->delete();
    }

    public function categoryBelongsToChain(string $categoryId, string $chainId): bool
    {
        return Category::query()->where('chain_id', $chainId)->whereKey($categoryId)->exists();
    }

    public function productBelongsToChain(string $productId, string $chainId): bool
    {
        return Product::query()
            ->whereKey($productId)
            ->whereHas('category', fn ($query) => $query->where('chain_id', $chainId))
            ->exists();
    }
}
