<?php

namespace App\Services;

use App\Domain\Geo\GeoMath;
use App\Domain\Pricing\PricingCalculator;
use App\Enums\CampaignMorphType;
use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\OrderAddress;
use App\Models\Promotion;
use App\Models\Restaurant;
use App\Models\UserAddress;
use Illuminate\Validation\ValidationException;

class OrderPricingService
{
    private const DELIVERY_BASE_FEE = 1.50;

    private const DELIVERY_FEE_PER_KM = 0.45;

    private const DELIVERY_MAX_FEE = 6.00;

    /**
     * @return array{subtotal: float, discount_total: float, delivery_fee: float, total: float, discounts: array<int, array<string, mixed>>, coupon: Coupon|null}
     */
    public function price(
        Cart $cart,
        Restaurant $restaurant,
        UserAddress|OrderAddress|string|null $address = null,
        ?string $couponCode = null
    ): array {
        if (is_string($address) && $couponCode === null) {
            $couponCode = $address;
            $address = null;
        } elseif (! $address instanceof UserAddress && ! $address instanceof OrderAddress) {
            $address = null;
        }

        $cart->loadMissing(['items.restaurantProduct.product.category', 'items.options']);

        $subtotal = PricingCalculator::calculateSubtotal($cart->items->pluck('total_price'));
        $deliveryFee = $address ? $this->deliveryFee($restaurant, $address) : 0.0;
        $discounts = [];

        foreach ($this->activePromotions((string) $restaurant->chain_id) as $promotion) {
            foreach ($this->promotionDiscounts($cart, $promotion, $subtotal, $deliveryFee) as $discount) {
                $discounts[] = $discount;
            }
        }

        $coupon = null;
        if ($couponCode !== null && trim($couponCode) !== '') {
            $coupon = $this->validCoupon((string) $restaurant->chain_id, trim($couponCode), $subtotal);
            $discounts[] = $this->couponDiscount($cart, $coupon, $subtotal, $deliveryFee);
        }

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

    public function deliveryFee(Restaurant $restaurant, UserAddress|OrderAddress $address): float
    {
        $restaurant->loadMissing('address');

        if (! $restaurant->address) {
            throw ValidationException::withMessages([
                'restaurant_id' => 'Restaurant has no pickup address configured.',
            ]);
        }

        $distanceKm = GeoMath::distanceKm(
            (float) $restaurant->address->latitude,
            (float) $restaurant->address->longitude,
            (float) $address->latitude,
            (float) $address->longitude
        );

        return round(min(
            self::DELIVERY_MAX_FEE,
            self::DELIVERY_BASE_FEE + ($distanceKm * self::DELIVERY_FEE_PER_KM)
        ), 2);
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
    private function promotionDiscounts(Cart $cart, Promotion $promotion, float $subtotal, float $deliveryFee): array
    {
        $discounts = [];
        $type = DiscountType::from($promotion->type);
        $target = DiscountTarget::from($promotion->target);

        if (in_array($target, [DiscountTarget::ORDER, DiscountTarget::DELIVERY], true)) {
            $base = $target === DiscountTarget::ORDER ? $subtotal : $deliveryFee;
            $amount = PricingCalculator::discountAmount($base, (float) $promotion->discount, $type);

            return [[
                'name_snapshot' => $promotion->name,
                'description_snapshot' => $promotion->description,
                'discount_amount' => $amount,
                'discount_type' => $type->value,
                'discount_target' => $target->value,
                'origin_type' => CampaignMorphType::PROMOTION->value,
                'origin_id' => $promotion->id,
                'cart_item_id' => null,
            ]];
        }

        foreach ($promotion->promotionItems as $promotionItem) {
            foreach ($cart->items as $cartItem) {
                $product = $cartItem->restaurantProduct->product;
                $matchesProduct = $target === DiscountTarget::PRODUCT
                    && $promotionItem->item_id === $product->id;
                $matchesCategory = $target === DiscountTarget::CATEGORY
                    && $promotionItem->item_id === $product->category_id;

                if (! $matchesProduct && ! $matchesCategory) {
                    continue;
                }

                $amount = PricingCalculator::discountAmount((float) $cartItem->total_price, (float) $promotion->discount, $type);
                $discounts[] = [
                    'name_snapshot' => $promotion->name,
                    'description_snapshot' => $promotion->description,
                    'discount_amount' => $amount,
                    'discount_type' => $type->value,
                    'discount_target' => $target->value,
                    'origin_type' => CampaignMorphType::PROMOTION->value,
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
            ->with('promotionItems')
            ->where('chain_id', $chainId)
            ->where('code', $code)
            ->first();

        if (! $coupon) {
            throw ValidationException::withMessages(['coupon_code' => 'Coupon not found.']);
        }

        if ($coupon->expiry_date && $coupon->expiry_date->isPast()) {
            throw ValidationException::withMessages(['coupon_code' => 'Coupon expired.']);
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

        return [
            'name_snapshot' => $coupon->code,
            'description_snapshot' => $coupon->description,
            'discount_amount' => $amount,
            'discount_type' => $type->value,
            'discount_target' => $target->value,
            'origin_type' => CampaignMorphType::COUPON->value,
            'origin_id' => $coupon->id,
            'cart_item_id' => null,
        ];
    }

    private function couponTargetBase(Cart $cart, Coupon $coupon, DiscountTarget $target): float
    {
        return (float) $cart->items->sum(function ($cartItem) use ($coupon, $target): float {
            $product = $cartItem->restaurantProduct->product;
            $matchesTargetItem = $coupon->promotionItems->contains(
                fn ($promotionItem) => $promotionItem->item_id === (
                    $target === DiscountTarget::PRODUCT ? $product->id : $product->category_id
                )
            );

            if ($target === DiscountTarget::PRODUCT && $matchesTargetItem) {
                return (float) $cartItem->total_price;
            }

            if ($target === DiscountTarget::CATEGORY && $matchesTargetItem) {
                return (float) $cartItem->total_price;
            }

            return 0.0;
        });
    }
}
