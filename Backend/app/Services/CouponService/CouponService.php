<?php

namespace App\Services\CouponService;

use App\Aspects\Transactional;
use App\DTOs\Campaigns\Coupon\CreateCouponDTO;
use App\DTOs\Campaigns\Coupon\UpdateCouponDTO;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\RestaurantChain;
use Illuminate\Validation\ValidationException;

class CouponService implements CouponServiceInterface
{
    public function forChain(string $chainId)
    {
        return Coupon::query()
            ->where('chain_id', $chainId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function findByCode(string $code): ?Coupon
    {
        return Coupon::query()->where('code', $code)->first();
    }

    public function find(string $id): ?Coupon
    {
        return Coupon::query()->find($id);
    }

    #[Transactional]
    public function createCoupon(CreateCouponDTO $data): Coupon
    {
        $this->validateCoupon($data->chain_id, $data->discount, $data->product_id, $data->category_id);

        return Coupon::query()->create($this->payload($data));
    }

    #[Transactional]
    public function updateCoupon(string $id, UpdateCouponDTO $data): ?Coupon
    {
        $coupon = Coupon::query()->find($id);

        if (! $coupon) {
            return null;
        }

        $this->validateCoupon(
            $coupon->chain_id,
            $data->discount ?? $coupon->discount,
            $data->product_id,
            $data->category_id,
        );

        $coupon->update(array_filter($this->payload($data), static fn ($value) => $value !== null));

        return $coupon;
    }

    #[Transactional]
    public function delete(string $id): bool
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
            'product_id' => $data->product_id,
            'category_id' => $data->category_id,
            'min_order_total' => $data->min_order_total,
            'max_discount_amount' => $data->max_discount_amount,
            'max_uses' => $data->max_uses,
        ];
    }

    private function validateCoupon(string $chainId, ?float $discount, ?string $productId, ?string $categoryId): void
    {
        $errors = [];

        if (! RestaurantChain::query()->whereKey($chainId)->exists()) {
            $errors['chain_id'][] = 'Restaurant chain does not exist.';
        }

        if ($discount === null || $discount <= 0) {
            $errors['discount'][] = 'Discount must be greater than zero.';
        }

        if ($productId && $categoryId) {
            $errors['target'][] = 'Coupon cannot target product and category at the same time.';
        }

        if ($categoryId && ! Category::query()->where('chain_id', $chainId)->whereKey($categoryId)->exists()) {
            $errors['category_id'][] = 'Category does not belong to coupon chain.';
        }

        if ($productId) {
            $belongsToChain = Product::query()
                ->whereKey($productId)
                ->whereHas('category', fn ($query) => $query->where('chain_id', $chainId))
                ->exists();

            if (! $belongsToChain) {
                $errors['product_id'][] = 'Product does not belong to coupon chain.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
