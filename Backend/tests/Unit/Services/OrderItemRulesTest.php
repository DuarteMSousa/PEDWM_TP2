<?php

namespace Tests\Unit\Services;

use App\Domain\Orders\OrderItemRules;
use App\Enums\OrderItemStatus;
use PHPUnit\Framework\TestCase;

class OrderItemRulesTest extends TestCase
{
    public function test_order_is_ready_when_all_non_cancelled_items_are_ready(): void
    {
        $this->assertTrue(OrderItemRules::allNonCancelledReady([
            OrderItemStatus::READY,
            OrderItemStatus::CANCELLED,
            'READY',
        ]));
    }

    public function test_order_is_not_ready_when_any_non_cancelled_item_is_pending_or_preparing(): void
    {
        $this->assertFalse(OrderItemRules::allNonCancelledReady([
            OrderItemStatus::READY,
            OrderItemStatus::PREPARING,
        ]));

        $this->assertFalse(OrderItemRules::allNonCancelledReady([
            OrderItemStatus::PENDING,
            OrderItemStatus::CANCELLED,
        ]));
    }

    public function test_order_is_not_ready_when_all_items_are_cancelled(): void
    {
        $this->assertFalse(OrderItemRules::allNonCancelledReady([
            OrderItemStatus::CANCELLED,
            'CANCELLED',
        ]));
    }
}
