<?php

namespace Tests\Unit\Services;

use App\Domain\Pricing\PricingCalculator;
use App\Enums\DiscountType;
use PHPUnit\Framework\TestCase;

class PricingCalculatorTest extends TestCase
{
    public function test_normalizes_invalid_quantities_to_one(): void
    {
        $this->assertSame(1, PricingCalculator::normalizeQuantity(0));
        $this->assertSame(1, PricingCalculator::normalizeQuantity(-4));
        $this->assertSame(1, PricingCalculator::normalizeQuantity(null));
        $this->assertSame(3, PricingCalculator::normalizeQuantity(3));
    }

    public function test_calculates_cart_item_total_with_options_and_quantity(): void
    {
        $total = PricingCalculator::calculateCartItemTotal(
            unitPrice: 8.5,
            optionExtraPrices: [1.25, '0.75'],
            quantity: 2
        );

        $this->assertSame(21.0, $total);
    }

    public function test_calculates_percentage_and_fixed_discounts_with_caps(): void
    {
        $this->assertSame(2.5, PricingCalculator::discountAmount(10, 25, DiscountType::PERCENTAGE));
        $this->assertSame(10.0, PricingCalculator::discountAmount(10, 200, DiscountType::PERCENTAGE));
        $this->assertSame(4.0, PricingCalculator::discountAmount(10, 4, DiscountType::FIXED_AMOUNT));
        $this->assertSame(10.0, PricingCalculator::discountAmount(10, 50, DiscountType::FIXED_AMOUNT));
    }

    public function test_calculates_final_total_without_negative_values(): void
    {
        $this->assertSame(13.5, PricingCalculator::calculateTotal(12, 2.5, 1));
        $this->assertSame(0.0, PricingCalculator::calculateTotal(5, 0, 9));
    }

    public function test_filters_and_sums_only_positive_discounts(): void
    {
        $discounts = PricingCalculator::onlyPositiveDiscounts([
            ['discount_amount' => 2.25],
            ['discount_amount' => 0],
            ['discount_amount' => -1],
            ['discount_amount' => 1.75],
        ]);

        $this->assertCount(2, $discounts);
        $this->assertSame(4.0, PricingCalculator::calculateDiscountTotal($discounts));
    }
}
