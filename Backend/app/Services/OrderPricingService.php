<?php

namespace App\Services;

use App\Domain\Pricing\PricingCalculator;
use App\Enums\DiscountOriginType;
use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Promotion;
use App\Models\Restaurant;
use Illuminate\Validation\ValidationException;

class OrderPricingService
{
    /**
     * @return array{subtotal: float, discount_total: float, delivery_fee: float, total: float, discounts: array<int, array<string, mixed>>, coupon: Coupon|null}
     */
    public function price(Cart $cart, Restaurant $restaurant, ?string $couponCode = null): array
    {
        $cart->loadMissing(['items.restaurantProduct.product.category', 'items.options']);

        $subtotal = PricingCalculator::calculateSubtotal($cart->items->pluck('total_price'));
        $deliveryFee = 0.0;
        $discounts = [];

        foreach ($this->activePromotions((string) $restaurant->chain_id) as $promotion) {
            foreach ($this->promotionDiscounts($cart, $promotion) as $discount) {
                $discounts[] = $discount;
            }
        }

        $coupon = null;
        if ($couponCode !== null && trim($couponCode) !== '') {
            $coupon = $this->validCoupon((string) $restaurant->chain_id, trim($couponCode), $subtotal);
            $discounts[] = $this->couponDiscount($cart, $coupon, $subtotal, $deliveryFee);
        }

        $discounts = PricingCalculator::onlyPositiveDiscounts($discounts);
        $discountTotal = PricingCalculator::calculateDiscountTotal($discounts);
        $total = PricingCalculator::calculateTotal($subtotal, $deliveryFee, $discountTotal);

        return [
            'subtotal' => $subtotal,
            'discount_total' => $discountTotal,
            'delivery_fee' => $deliveryFee,
            'total' => $total,
            'discounts' => $discounts,
            'coupon' => $coupon,
        ];
    }

    private function activePromotions(string $chainId)
    {
        $now = now();

        return Promotion::query()
            ->with('promotionItems')
            ->where('chain_id', $chainId)
            ->where(function ($query) use ($now): void {
                $query->whereNull('start_date')->orWhere('start_date', '<=', $now);
            })
            ->where(function ($query) use ($now): void {
                $query->whereNull('end_date')->orWhere('end_date', '>=', $now);
            })
            ->get();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function promotionDiscounts(Cart $cart, Promotion $promotion): array
    {
        $discounts = [];
        $type = DiscountType::from($promotion->type);
        $target = DiscountTarget::from($promotion->target);

        if ($target === DiscountTarget::ORDER) {
            $base = PricingCalculator::calculateSubtotal($cart->items->pluck('total_price'));
            $amount = PricingCalculator::discountAmount($base, (float) $this->promotionDiscountValue($promotion), $type);

            return [[
                'name_snapshot' => $promotion->name,
                'description_snapshot' => $promotion->description,
                'discount_amount' => $amount,
                'discount_type' => $type->value,
                'discount_target' => $target->value,
                'origin_type' => DiscountOriginType::PROMOTION->value,
                'origin_id' => $promotion->id,
                'cart_item_id' => null,
            ]];
        }

        foreach ($promotion->promotionItems as $promotionItem) {
            foreach ($cart->items as $cartItem) {
                $product = $cartItem->restaurantProduct->product;
                $matchesProduct = $target === DiscountTarget::PRODUCT
                    && $promotionItem->product_id
                    && $promotionItem->product_id === $product->id;
                $matchesCategory = $target === DiscountTarget::CATEGORY
                    && $promotionItem->category_id
                    && $promotionItem->category_id === $product->category_id;

                if (! $matchesProduct && ! $matchesCategory) {
                    continue;
                }

                $amount = PricingCalculator::discountAmount((float) $cartItem->total_price, (float) $promotionItem->discount, $type);
                $discounts[] = [
                    'name_snapshot' => $promotion->name,
                    'description_snapshot' => $promotion->description,
                    'discount_amount' => $amount,
                    'discount_type' => $type->value,
                    'discount_target' => $target->value,
                    'origin_type' => DiscountOriginType::PROMOTION->value,
                    'origin_id' => $promotion->id,
                    'cart_item_id' => $cartItem->id,
                ];
            }
        }

        return $discounts;
    }

    private function validCoupon(string $chainId, string $code, float $subtotal): Coupon
    {
        $coupon = Coupon::query()
            ->where('chain_id', $chainId)
            ->where('code', $code)
            ->first();

        if (! $coupon) {
            throw ValidationException::withMessages(['coupon_code' => 'Coupon not found.']);
        }

        if ($coupon->expiry_date && $coupon->expiry_date->isPast()) {
            throw ValidationException::withMessages(['coupon_code' => 'Coupon expired.']);
        }

        if ($coupon->min_order_total !== null && $subtotal < $coupon->min_order_total) {
            throw ValidationException::withMessages(['coupon_code' => 'Order total is below coupon minimum.']);
        }

        if ($coupon->max_uses !== null && $coupon->used_count >= $coupon->max_uses) {
            throw ValidationException::withMessages(['coupon_code' => 'Coupon usage limit reached.']);
        }

        return $coupon;
    }

    /**
     * @return array<string, mixed>
     */
    private function couponDiscount(Cart $cart, Coupon $coupon, float $subtotal, float $deliveryFee): array
    {
        $type = DiscountType::from($coupon->type);
        $target = DiscountTarget::from($coupon->target);
        $base = match ($target) {
            DiscountTarget::ORDER => $subtotal,
            DiscountTarget::DELIVERY => $deliveryFee,
            DiscountTarget::PRODUCT, DiscountTarget::CATEGORY => $this->couponTargetBase($cart, $coupon, $target),
        };

        $amount = PricingCalculator::discountAmount($base, (float) $coupon->discount, $type);

        if ($coupon->max_discount_amount !== null) {
            $amount = min($amount, (float) $coupon->max_discount_amount);
        }

        return [
            'name_snapshot' => $coupon->code,
            'description_snapshot' => $coupon->description,
            'discount_amount' => $amount,
            'discount_type' => $type->value,
            'discount_target' => $target->value,
            'origin_type' => DiscountOriginType::COUPON->value,
            'origin_id' => $coupon->id,
            'cart_item_id' => null,
        ];
    }

    private function couponTargetBase(Cart $cart, Coupon $coupon, DiscountTarget $target): float
    {
        return (float) $cart->items->sum(function ($cartItem) use ($coupon, $target): float {
            $product = $cartItem->restaurantProduct->product;

            if ($target === DiscountTarget::PRODUCT && $coupon->product_id === $product->id) {
                return (float) $cartItem->total_price;
            }

            if ($target === DiscountTarget::CATEGORY && $coupon->category_id === $product->category_id) {
                return (float) $cartItem->total_price;
            }

            return 0.0;
        });
    }

    private function promotionDiscountValue(Promotion $promotion): float
    {
        return (float) ($promotion->promotionItems->first()?->discount ?? 0);
    }
}
