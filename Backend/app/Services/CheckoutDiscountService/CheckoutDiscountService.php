<?php

namespace App\Services\CheckoutDiscountService;

use App\Enums\DiscountOriginType;
use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use App\Models\Coupon;
use App\Models\OrderItem;
use App\Models\Promotion;
use Carbon\Carbon;
use GraphQL\Error\UserError;
use Illuminate\Support\Collection;

class CheckoutDiscountService implements CheckoutDiscountServiceInterface
{
    /**
     * @param  Collection<string, array{order_item: OrderItem, product_id: ?string, category_id: ?string, line_total: float}>  $itemMetadata
     * @return array{discounts: array<int, array<string, mixed>>, applied_coupon: ?Coupon}
     */
    public function resolveDiscounts(
        ?string $chainId,
        Collection $itemMetadata,
        float $subTotal,
        float $deliveryFee,
        ?string $couponCode
    ): array {
        if (! $chainId) {
            return ['discounts' => [], 'applied_coupon' => null];
        }

        $discounts = [];
        $appliedCoupon = null;
        $now = Carbon::now();

        $promotions = Promotion::query()
            ->with('promotionItems')
            ->where('chain_id', $chainId)
            ->where(function ($query) use ($now): void {
                $query->whereNull('start_date')->orWhere('start_date', '<=', $now);
            })
            ->where(function ($query) use ($now): void {
                $query->whereNull('end_date')->orWhere('end_date', '>=', $now);
            })
            ->get();

        foreach ($promotions as $promotion) {
            $promotionType = DiscountType::from($promotion->type);
            $promotionTarget = DiscountTarget::from($promotion->target);

            if ($promotionTarget === DiscountTarget::ORDER) {
                $value = (float) ($promotion->promotionItems->first()?->discount ?? 0);
                $amount = $this->calculateDiscountAmount($subTotal, $promotionType, $value);

                if ($amount > 0) {
                    $discounts[] = [
                        'name_snapshot' => $promotion->name,
                        'description_snapshot' => $promotion->description,
                        'discount_amount' => $amount,
                        'discount_type' => $promotionType,
                        'discount_target' => DiscountTarget::ORDER,
                        'order_item_id' => null,
                        'origin_type' => DiscountOriginType::PROMOTION,
                        'origin_id' => $promotion->id,
                    ];
                }

                continue;
            }

            if ($promotionTarget === DiscountTarget::DELIVERY) {
                $value = (float) ($promotion->promotionItems->first()?->discount ?? 0);
                $amount = $this->calculateDiscountAmount($deliveryFee, $promotionType, $value);

                if ($amount > 0) {
                    $discounts[] = [
                        'name_snapshot' => $promotion->name,
                        'description_snapshot' => $promotion->description,
                        'discount_amount' => $amount,
                        'discount_type' => $promotionType,
                        'discount_target' => DiscountTarget::DELIVERY,
                        'order_item_id' => null,
                        'origin_type' => DiscountOriginType::PROMOTION,
                        'origin_id' => $promotion->id,
                    ];
                }

                continue;
            }

            if (! in_array($promotionTarget, [DiscountTarget::PRODUCT, DiscountTarget::CATEGORY], true)) {
                continue;
            }

            foreach ($promotion->promotionItems as $promotionItem) {
                foreach ($itemMetadata as $itemMeta) {
                    $matchesProduct = $promotionTarget === DiscountTarget::PRODUCT
                        && $promotionItem->product_id
                        && $promotionItem->product_id === $itemMeta['product_id'];

                    $matchesCategory = $promotionTarget === DiscountTarget::CATEGORY
                        && $promotionItem->category_id
                        && $promotionItem->category_id === $itemMeta['category_id'];

                    if (! $matchesProduct && ! $matchesCategory) {
                        continue;
                    }

                    $amount = $this->calculateDiscountAmount(
                        $itemMeta['line_total'],
                        $promotionType,
                        (float) $promotionItem->discount
                    );

                    if ($amount <= 0) {
                        continue;
                    }

                    $discounts[] = [
                        'name_snapshot' => $promotion->name,
                        'description_snapshot' => $promotion->description,
                        'discount_amount' => $amount,
                        'discount_type' => $promotionType,
                        'discount_target' => $promotionTarget,
                        'order_item_id' => $itemMeta['order_item']->id,
                        'origin_type' => DiscountOriginType::PROMOTION,
                        'origin_id' => $promotion->id,
                    ];
                }
            }
        }

        if ($couponCode) {
            $coupon = Coupon::query()
                ->where('chain_id', $chainId)
                ->whereRaw('LOWER(code) = ?', [mb_strtolower($couponCode)])
                ->lockForUpdate()
                ->first();

            if (! $coupon) {
                throw new UserError('Coupon not found for this restaurant chain.');
            }

            if ($coupon->expiry_date && Carbon::parse($coupon->expiry_date)->isPast()) {
                throw new UserError('Coupon has expired.');
            }

            if ($coupon->max_uses !== null && (int) $coupon->used_count >= (int) $coupon->max_uses) {
                throw new UserError('Coupon usage limit reached.');
            }

            if ($coupon->min_order_total !== null && $subTotal < (float) $coupon->min_order_total) {
                throw new UserError('Coupon minimum order amount not reached.');
            }

            $couponType = DiscountType::from($coupon->type);
            $couponTarget = DiscountTarget::from($coupon->target);
            $couponValue = (float) ($coupon->discount ?? 0);
            $maxCouponDiscount = $coupon->max_discount_amount !== null ? (float) $coupon->max_discount_amount : null;

            if ($couponTarget === DiscountTarget::ORDER || $couponTarget === DiscountTarget::DELIVERY) {
                $couponBase = $couponTarget === DiscountTarget::DELIVERY ? $deliveryFee : $subTotal;
                $couponAmount = $this->calculateDiscountAmount($couponBase, $couponType, $couponValue);
                if ($maxCouponDiscount !== null) {
                    $couponAmount = min($couponAmount, $maxCouponDiscount);
                }

                if ($couponAmount > 0) {
                    $discounts[] = [
                        'name_snapshot' => $coupon->code,
                        'description_snapshot' => $coupon->description,
                        'discount_amount' => $couponAmount,
                        'discount_type' => $couponType,
                        'discount_target' => $couponTarget,
                        'order_item_id' => null,
                        'origin_type' => DiscountOriginType::COUPON,
                        'origin_id' => $coupon->id,
                    ];
                    $appliedCoupon = $coupon;
                }
            }

            if ($couponTarget === DiscountTarget::PRODUCT || $couponTarget === DiscountTarget::CATEGORY) {
                $couponApplied = false;

                foreach ($itemMetadata as $itemMeta) {
                    $matchesProduct = $couponTarget === DiscountTarget::PRODUCT
                        && $coupon->product_id
                        && $coupon->product_id === $itemMeta['product_id'];

                    $matchesCategory = $couponTarget === DiscountTarget::CATEGORY
                        && $coupon->category_id
                        && $coupon->category_id === $itemMeta['category_id'];

                    if (! $matchesProduct && ! $matchesCategory) {
                        continue;
                    }

                    $couponAmount = $this->calculateDiscountAmount(
                        $itemMeta['line_total'],
                        $couponType,
                        $couponValue
                    );

                    if ($maxCouponDiscount !== null) {
                        $couponAmount = min($couponAmount, $maxCouponDiscount);
                    }

                    if ($couponAmount <= 0) {
                        continue;
                    }

                    $discounts[] = [
                        'name_snapshot' => $coupon->code,
                        'description_snapshot' => $coupon->description,
                        'discount_amount' => $couponAmount,
                        'discount_type' => $couponType,
                        'discount_target' => $couponTarget,
                        'order_item_id' => $itemMeta['order_item']->id,
                        'origin_type' => DiscountOriginType::COUPON,
                        'origin_id' => $coupon->id,
                    ];

                    $couponApplied = true;
                }

                if ($couponApplied) {
                    $appliedCoupon = $coupon;
                }
            }
        }

        return [
            'discounts' => $discounts,
            'applied_coupon' => $appliedCoupon,
        ];
    }

    private function calculateDiscountAmount(float $baseAmount, DiscountType $discountType, float $discountValue): float
    {
        if ($baseAmount <= 0 || $discountValue <= 0) {
            return 0.0;
        }

        $amount = $discountType === DiscountType::PERCENTAGE
            ? ($baseAmount * $discountValue) / 100
            : $discountValue;

        return round(max(0, min($amount, $baseAmount)), 2);
    }
}

