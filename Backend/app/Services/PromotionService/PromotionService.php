<?php

namespace App\Services\PromotionService;

use App\Aspects\Transactional;
use App\DTOs\Campaigns\Promotion\CreatePromotionDTO;
use App\DTOs\Campaigns\Promotion\UpdatePromotionDTO;
use App\Models\Category;
use App\Models\Product;
use App\Models\Promotion;
use Illuminate\Validation\ValidationException;

class PromotionService implements PromotionServiceInterface
{
    private array $with = ['promotionItems'];

    public function forChain(string $chainId)
    {
        return Promotion::query()
            ->with($this->with)
            ->where('chain_id', $chainId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function find(string $id): ?Promotion
    {
        return Promotion::query()->with($this->with)->find($id);
    }

    #[Transactional]
    public function createPromotion(string $actorUserId, CreatePromotionDTO $data): Promotion
    {
        $items = $data->items?->toArray() ?? [];
        $this->validatePromotion($data->chain_id, $data->start_date, $data->end_date, $items);

        $promotion = Promotion::query()->create([
            'chain_id' => $data->chain_id,
            'name' => $data->name,
            'description' => $data->description,
            'type' => $data->type->value,
            'target' => $data->target->value,
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
        $items = $data->items?->toArray();

        $this->validatePromotion($promotion->chain_id, $startDate, $endDate, $items ?? []);

        $promotion->update(array_filter([
            'name' => $data->name,
            'description' => $data->description,
            'type' => $data->type?->value,
            'target' => $data->target?->value,
            'start_date' => $data->start_date,
            'end_date' => $data->end_date,
        ], static fn ($value) => $value !== null));

        if ($items !== null) {
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
                'product_id' => $item['product_id'] ?? null,
                'category_id' => $item['category_id'] ?? null,
                'discount' => $item['discount'],
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

    private function validatePromotion(string $chainId, $startDate, $endDate, array $items): void
    {
        $errors = [];

        if ($startDate !== null && $endDate !== null && $startDate->gt($endDate)) {
            $errors['end_date'][] = 'end_date must be after start_date.';
        }

        foreach ($items as $index => $item) {
            if (($item['discount'] ?? 0) <= 0) {
                $errors["items.{$index}.discount"][] = 'Discount must be greater than zero.';
            }

            $hasProduct = ! empty($item['product_id']);
            $hasCategory = ! empty($item['category_id']);

            if ($hasProduct === $hasCategory) {
                $errors["items.{$index}"][] = 'Promotion item must target exactly one product or category.';
            }

            if ($hasCategory && ! Category::query()->where('chain_id', $chainId)->whereKey($item['category_id'])->exists()) {
                $errors["items.{$index}.category_id"][] = 'Category does not belong to promotion chain.';
            }

            if ($hasProduct) {
                $belongsToChain = Product::query()
                    ->whereKey($item['product_id'])
                    ->whereHas('category', fn ($query) => $query->where('chain_id', $chainId))
                    ->exists();

                if (! $belongsToChain) {
                    $errors["items.{$index}.product_id"][] = 'Product does not belong to promotion chain.';
                }
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
