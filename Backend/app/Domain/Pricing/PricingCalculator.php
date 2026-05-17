<?php

namespace App\Domain\Pricing;

use App\Enums\DiscountType;

final class PricingCalculator
{
    public static function normalizeQuantity(?int $quantity): int
    {
        return max(1, (int) $quantity);
    }

    /**
     * @param  iterable<int, float|int|string|null>  $optionExtraPrices
     */
    public static function calculateCartItemTotal(float $unitPrice, iterable $optionExtraPrices, int $quantity): float
    {
        $optionsTotal = 0.0;

        foreach ($optionExtraPrices as $price) {
            $optionsTotal += (float) $price;
        }

        return round(($unitPrice + $optionsTotal) * self::normalizeQuantity($quantity), 2);
    }

    /**
     * @param  iterable<int, float|int|string|null>  $lineTotals
     */
    public static function calculateSubtotal(iterable $lineTotals): float
    {
        $subtotal = 0.0;

        foreach ($lineTotals as $lineTotal) {
            $subtotal += (float) $lineTotal;
        }

        return round($subtotal, 2);
    }

    public static function discountAmount(float $base, float $discount, DiscountType $type): float
    {
        if ($base <= 0 || $discount <= 0) {
            return 0.0;
        }

        return round(match ($type) {
            DiscountType::PERCENTAGE => $base * min($discount, 100) / 100,
            DiscountType::FIXED_AMOUNT => min($base, $discount),
        }, 2);
    }

    /**
     * @param  array<int, array<string, mixed>>  $discounts
     * @return array<int, array<string, mixed>>
     */
    public static function onlyPositiveDiscounts(array $discounts): array
    {
        return array_values(array_filter(
            $discounts,
            static fn (array $discount): bool => ($discount['discount_amount'] ?? 0) > 0
        ));
    }

    /**
     * @param  array<int, array<string, mixed>>  $discounts
     */
    public static function calculateDiscountTotal(array $discounts): float
    {
        return round(array_sum(array_column($discounts, 'discount_amount')), 2);
    }

    public static function calculateTotal(float $subtotal, float $deliveryFee, float $discountTotal): float
    {
        return max(0, round($subtotal + $deliveryFee - $discountTotal, 2));
    }
}
