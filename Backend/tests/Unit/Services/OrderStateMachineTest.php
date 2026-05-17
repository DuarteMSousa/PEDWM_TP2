<?php

namespace Tests\Unit\Services;

use App\Domain\StateMachines\Orders\OrderStateFactory;
use App\Enums\OrderStatus;
use PHPUnit\Framework\TestCase;

class OrderStateMachineTest extends TestCase
{
    public function test_order_state_machine_allows_expected_mvp_flow(): void
    {
        $this->assertTrue(OrderStateFactory::from(OrderStatus::PENDING)->canTransitionTo(OrderStatus::CONFIRMED));
        $this->assertTrue(OrderStateFactory::from(OrderStatus::CONFIRMED)->canTransitionTo(OrderStatus::PREPARING));
        $this->assertTrue(OrderStateFactory::from(OrderStatus::PREPARING)->canTransitionTo(OrderStatus::READY));
        $this->assertTrue(OrderStateFactory::from(OrderStatus::READY)->canTransitionTo(OrderStatus::OUT_FOR_DELIVERY));
        $this->assertTrue(OrderStateFactory::from(OrderStatus::OUT_FOR_DELIVERY)->canTransitionTo(OrderStatus::DELIVERED));
    }

    public function test_order_state_machine_blocks_backwards_or_terminal_transitions(): void
    {
        $this->assertFalse(OrderStateFactory::from(OrderStatus::READY)->canTransitionTo(OrderStatus::PREPARING));
        $this->assertFalse(OrderStateFactory::from(OrderStatus::DELIVERED)->canTransitionTo(OrderStatus::CANCELLED));
        $this->assertFalse(OrderStateFactory::from(OrderStatus::CANCELLED)->canTransitionTo(OrderStatus::CONFIRMED));
    }

    public function test_order_state_machine_allows_cancellation_before_terminal_states(): void
    {
        $this->assertTrue(OrderStateFactory::from(OrderStatus::PENDING)->canTransitionTo(OrderStatus::CANCELLED));
        $this->assertTrue(OrderStateFactory::from(OrderStatus::CONFIRMED)->canTransitionTo(OrderStatus::CANCELLED));
        $this->assertTrue(OrderStateFactory::from(OrderStatus::PREPARING)->canTransitionTo(OrderStatus::CANCELLED));
        $this->assertTrue(OrderStateFactory::from(OrderStatus::OUT_FOR_DELIVERY)->canTransitionTo(OrderStatus::CANCELLED));
    }
}
