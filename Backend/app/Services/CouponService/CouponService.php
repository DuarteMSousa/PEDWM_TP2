<?php

namespace App\Services\CouponService;

use App\Aspects\Transactional;
use App\DTOs\Campaigns\Coupon\CreateCouponDTO;
use App\DTOs\Campaigns\Coupon\UpdateCouponDTO;
use App\Enums\DiscountTarget;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\RestaurantChain;
use Illuminate\Validation\ValidationException;

class CouponService implements CouponServiceInterface
{
    private array $with = ['promotionItems'];

    public function getCouponsByChainId(string $chainId)
    {
        return Coupon::query()
            ->with($this->with)
            ->where('chain_id', $chainId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function getCouponByCode(string $code): ?Coupon
    {
        return Coupon::query()->with($this->with)->where('code', $code)->first();
    }

    public function getCouponById(string $id): ?Coupon
    {
        return Coupon::query()->with($this->with)->find($id);
    }

    #[Transactional]
    public function createCoupon(CreateCouponDTO $data): Coupon
    {
        $items = $data->items?->toArray() ?? [];
        $this->validateCoupon($data->chain_id, $data->target, $data->discount, $items);

        $coupon = Coupon::query()->create($this->payload($data));
        $this->replaceItems($coupon, $items);

        return $coupon->load($this->with);
    }

    #[Transactional]
    public function updateCoupon(string $id, UpdateCouponDTO $data): ?Coupon
    {
        $coupon = Coupon::query()->with($this->with)->find($id);

        if (! $coupon) {
            return null;
        }

        $target = $data->target ?? DiscountTarget::from($coupon->target);
        $items = $data->items?->toArray();
        $itemsForValidation = $items ?? (
            in_array($target, [DiscountTarget::ORDER, DiscountTarget::DELIVERY], true)
                ? []
                : $coupon->promotionItems->map(fn ($item) => [
                    'id' => $item->id,
                    'item_id' => $item->item_id,
                ])->all()
        );

        $this->validateCoupon($coupon->chain_id, $target, $data->discount ?? $coupon->discount, $itemsForValidation);

        $coupon->update(array_filter($this->payload($data), static fn ($value) => $value !== null));

        if (in_array($target, [DiscountTarget::ORDER, DiscountTarget::DELIVERY], true)) {
            $coupon->promotionItems()->delete();
        } elseif ($items !== null) {
            $this->replaceItems($coupon, $items);
        }

        return $coupon->refresh()->load($this->with);
    }

    #[Transactional]
    public function deleteCoupon(string $id): bool
    {
        return (bool) Coupon::query()->whereKey($id)->delete();
    }

    private function payload(CreateCouponDTO|UpdateCouponDTO $data): array
    {
        return [
            'chain_id' => $data instanceof CreateCouponDTO ? $data->chain_id : null,
            'code' => $data->code,
            'description' => $data->description,
            'type' => $data->type?->value,
            'target' => $data->target?->value,
            'expiry_date' => $data->expiry_date,
            'discount' => $data->discount,
        ];
    }

    private function replaceItems(Coupon $coupon, array $items): void
    {
        $keptIds = [];

        foreach ($items as $item) {
            $payload = ['item_id' => $item['item_id']];

            if (! empty($item['id'])) {
                $promotionItem = $coupon->promotionItems()->whereKey($item['id'])->first();

                if ($promotionItem) {
                    $promotionItem->update($payload);
                } else {
                    $promotionItem = $coupon->promotionItems()->create($payload);
                }
            } else {
                $promotionItem = $coupon->promotionItems()->create($payload);
            }

            $keptIds[] = $promotionItem->id;
        }

        if ($items === []) {
            $coupon->promotionItems()->delete();

            return;
        }

        $coupon->promotionItems()->whereNotIn('id', $keptIds)->delete();
    }

    private function validateCoupon(string $chainId, DiscountTarget $target, ?float $discount, array $items): void
    {
        $errors = [];

        if (! RestaurantChain::query()->whereKey($chainId)->exists()) {
            $errors['chain_id'][] = 'Restaurant chain does not exist.';
        }

        if ($discount === null || $discount <= 0) {
            $errors['discount'][] = 'Discount must be greater than zero.';
        }

        if (in_array($target, [DiscountTarget::ORDER, DiscountTarget::DELIVERY], true)) {
            if ($items !== []) {
                $errors['items'][] = 'Coupon items are only allowed for product or category targets.';
            }
        } elseif ($items === []) {
            $errors['items'][] = 'Coupon must include at least one item for product or category targets.';
        }

        foreach ($items as $index => $item) {
            $itemId = $item['item_id'] ?? null;

            if (! $itemId) {
                $errors["items.{$index}.item_id"][] = 'Coupon item must have an item_id.';

                continue;
            }

            if ($target === DiscountTarget::CATEGORY && ! Category::query()->where('chain_id', $chainId)->whereKey($itemId)->exists()) {
                $errors["items.{$index}.item_id"][] = 'Category does not belong to coupon chain.';
            }

            if ($target === DiscountTarget::PRODUCT) {
                $belongsToChain = Product::query()
                    ->whereKey($itemId)
                    ->whereHas('category', fn ($query) => $query->where('chain_id', $chainId))
                    ->exists();

                if (! $belongsToChain) {
                    $errors["items.{$index}.item_id"][] = 'Product does not belong to coupon chain.';
                }
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
