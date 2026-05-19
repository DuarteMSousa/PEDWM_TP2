<?php

namespace App\Services\PromotionService;

use App\Aspects\Transactional;
use App\DTOs\Campaigns\Promotion\CreatePromotionDTO;
use App\DTOs\Campaigns\Promotion\UpdatePromotionDTO;
use App\Enums\DiscountTarget;
use App\Models\Category;
use App\Models\Product;
use App\Models\Promotion;
use Illuminate\Validation\ValidationException;

class PromotionService implements PromotionServiceInterface
{
    private array $with = ['promotionItems'];

    public function getPromotionsByChainId(string $chainId)
    {
        return Promotion::query()
            ->with($this->with)
            ->where('chain_id', $chainId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function getPromotionById(string $id): ?Promotion
    {
        return Promotion::query()->with($this->with)->find($id);
    }

    #[Transactional]
    public function createPromotion(string $actorUserId, CreatePromotionDTO $data): Promotion
    {
        $items = $data->items?->toArray() ?? [];
        $this->validatePromotion($data->chain_id, $data->target, $data->discount, $data->start_date, $data->end_date, $items);

        $promotion = Promotion::query()->create([
            'chain_id' => $data->chain_id,
            'name' => $data->name,
            'description' => $data->description,
            'type' => $data->type->value,
            'target' => $data->target->value,
            'discount' => $data->discount,
            'start_date' => $data->start_date,
            'end_date' => $data->end_date,
        ]);

        $this->replaceItems($promotion, $items);

        return $promotion->load($this->with);
    }

    #[Transactional]
    public function updatePromotion(string $actorUserId, string $promotionId, UpdatePromotionDTO $data): Promotion
    {
        $promotion = Promotion::query()->with($this->with)->findOrFail($promotionId);
        $startDate = $data->start_date ?? $promotion->start_date;
        $endDate = $data->end_date ?? $promotion->end_date;
        $target = $data->target ?? DiscountTarget::from($promotion->target);
        $discount = $data->discount ?? $promotion->discount;
        $items = $data->items?->toArray();
        $itemsForValidation = $items ?? (
            in_array($target, [DiscountTarget::ORDER, DiscountTarget::DELIVERY], true)
                ? []
                : $promotion->promotionItems->map(fn ($item) => [
                    'id' => $item->id,
                    'item_id' => $item->item_id,
                ])->all()
        );

        $this->validatePromotion($promotion->chain_id, $target, $discount, $startDate, $endDate, $itemsForValidation);

        $promotion->update(array_filter([
            'name' => $data->name,
            'description' => $data->description,
            'type' => $data->type?->value,
            'target' => $data->target?->value,
            'discount' => $data->discount,
            'start_date' => $data->start_date,
            'end_date' => $data->end_date,
        ], static fn ($value) => $value !== null));

        if (in_array($target, [DiscountTarget::ORDER, DiscountTarget::DELIVERY], true)) {
            $promotion->promotionItems()->delete();
        } elseif ($items !== null) {
            $this->replaceItems($promotion, $items);
        }

        return $promotion->refresh()->load($this->with);
    }

    #[Transactional]
    public function deletePromotion(string $actorUserId, string $id): bool
    {
        return (bool) Promotion::query()->whereKey($id)->delete();
    }

    private function replaceItems(Promotion $promotion, array $items): void
    {
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

    private function validatePromotion(string $chainId, DiscountTarget $target, ?float $discount, $startDate, $endDate, array $items): void
    {
        $errors = [];

        if ($discount === null || $discount <= 0) {
            $errors['discount'][] = 'Discount must be greater than zero.';
        }

        if ($startDate !== null && $endDate !== null && $startDate->gt($endDate)) {
            $errors['end_date'][] = 'end_date must be after start_date.';
        }

        if (in_array($target, [DiscountTarget::ORDER, DiscountTarget::DELIVERY], true)) {
            if ($items !== []) {
                $errors['items'][] = 'Promotion items are only allowed for product or category targets.';
            }
        } elseif ($items === []) {
            $errors['items'][] = 'Promotion must include at least one item for product or category targets.';
        }

        foreach ($items as $index => $item) {
            $itemId = $item['item_id'] ?? null;

            if (! $itemId) {
                $errors["items.{$index}.item_id"][] = 'Promotion item must have an item_id.';

                continue;
            }

            if ($target === DiscountTarget::CATEGORY && ! Category::query()->where('chain_id', $chainId)->whereKey($itemId)->exists()) {
                $errors["items.{$index}.item_id"][] = 'Category does not belong to promotion chain.';
            }

            if ($target === DiscountTarget::PRODUCT) {
                $belongsToChain = Product::query()
                    ->whereKey($itemId)
                    ->whereHas('category', fn ($query) => $query->where('chain_id', $chainId))
                    ->exists();

                if (! $belongsToChain) {
                    $errors["items.{$index}.item_id"][] = 'Product does not belong to promotion chain.';
                }
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
