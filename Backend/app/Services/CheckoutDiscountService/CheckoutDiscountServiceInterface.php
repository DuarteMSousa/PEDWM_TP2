<?php

namespace App\Services\CheckoutDiscountService;

use Illuminate\Support\Collection;

interface CheckoutDiscountServiceInterface
{
    /**
     * @param  Collection<string, array{order_item: \App\Models\OrderItem, product_id: ?string, category_id: ?string, line_total: float}>  $itemMetadata
     * @return array{discounts: array<int, array<string, mixed>>, applied_coupon: ?\App\Models\Coupon}
     */
    public function resolveDiscounts(
        ?string $chainId,
        Collection $itemMetadata,
        float $subTotal,
        float $deliveryFee,
        ?string $couponCode
    ): array;
}

