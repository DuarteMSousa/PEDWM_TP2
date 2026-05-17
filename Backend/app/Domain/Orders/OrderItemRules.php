<?php

namespace App\Domain\Orders;

use App\Enums\OrderItemStatus;
use BackedEnum;

final class OrderItemRules
{
    /**
     * @param  iterable<int, BackedEnum|string>  $statuses
     */
    public static function allNonCancelledReady(iterable $statuses): bool
    {
        $hasNonCancelledItem = false;

        foreach ($statuses as $status) {
            $value = $status instanceof BackedEnum ? $status->value : $status;

            if ($value === OrderItemStatus::CANCELLED->value) {
                continue;
            }

            $hasNonCancelledItem = true;

            if ($value !== OrderItemStatus::READY->value) {
                return false;
            }
        }

        return $hasNonCancelledItem;
    }
}
