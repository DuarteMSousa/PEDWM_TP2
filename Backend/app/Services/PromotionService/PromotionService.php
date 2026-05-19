<?php

namespace App\Services\PromotionService;

use App\Aspects\Transactional;
use App\DTOs\Campaigns\Promotion\CreatePromotionDTO;
use App\DTOs\Campaigns\Promotion\UpdatePromotionDTO;
use App\Enums\DiscountTarget;
use App\Models\Promotion;
use App\Repositories\PromotionRepository\PromotionRepositoryInterface;
use Illuminate\Validation\ValidationException;

class PromotionService implements PromotionServiceInterface
{
    public function __construct(private PromotionRepositoryInterface $promotions) {}

    public function getPromotionsByChainId(string $chainId)
    {
        return $this->promotions->getByChainId($chainId);
    }

    public function getPromotionById(string $id): ?Promotion
    {
        return $this->promotions->getById($id);
    }

    #[Transactional]
    public function createPromotion(string $actorUserId, CreatePromotionDTO $data): Promotion
    {
        $items = $data->items?->toArray() ?? [];
        $this->validatePromotion($data->chain_id, $data->target, $data->discount, $data->start_date, $data->end_date, $items);

        $promotion = $this->promotions->createPromotion($data);

        $this->promotions->replaceItems($promotion->id, $items);

        return $this->promotions->getByIdOrFail($promotion->id);
    }

    #[Transactional]
    public function updatePromotion(string $actorUserId, string $promotionId, UpdatePromotionDTO $data): Promotion
    {
        $promotion = $this->promotions->getByIdOrFail($promotionId);
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

        $this->promotions->updatePromotion($promotion->id, $data);

        if (in_array($target, [DiscountTarget::ORDER, DiscountTarget::DELIVERY], true)) {
            $this->promotions->replaceItems($promotion->id, []);
        } elseif ($items !== null) {
            $this->promotions->replaceItems($promotion->id, $items);
        }

        return $this->promotions->getByIdOrFail($promotion->id);
    }

    #[Transactional]
    public function deletePromotion(string $actorUserId, string $id): bool
    {
        return (bool) $this->promotions->deletePromotion($id);
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

            if ($target === DiscountTarget::CATEGORY && ! $this->promotions->categoryBelongsToChain($itemId, $chainId)) {
                $errors["items.{$index}.item_id"][] = 'Category does not belong to promotion chain.';
            }

            if ($target === DiscountTarget::PRODUCT) {
                $belongsToChain = $this->promotions->productBelongsToChain($itemId, $chainId);

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
