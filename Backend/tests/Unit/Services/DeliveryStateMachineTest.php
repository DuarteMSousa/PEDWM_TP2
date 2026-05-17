<?php

namespace Tests\Unit\Services;

use App\Domain\StateMachines\Deliveries\DeliveryStateFactory;
use App\Enums\DeliveryStatus;
use PHPUnit\Framework\TestCase;

class DeliveryStateMachineTest extends TestCase
{
    public function test_delivery_state_machine_allows_expected_flow(): void
    {
        $this->assertTrue(DeliveryStateFactory::from(DeliveryStatus::PENDING)->canTransitionTo(DeliveryStatus::PICKED_UP));
        $this->assertTrue(DeliveryStateFactory::from(DeliveryStatus::PICKED_UP)->canTransitionTo(DeliveryStatus::IN_TRANSIT));
        $this->assertTrue(DeliveryStateFactory::from(DeliveryStatus::IN_TRANSIT)->canTransitionTo(DeliveryStatus::DELIVERED));
    }

    public function test_delivery_state_machine_allows_failure_until_terminal_state(): void
    {
        $this->assertTrue(DeliveryStateFactory::from(DeliveryStatus::PENDING)->canTransitionTo(DeliveryStatus::FAILED));
        $this->assertTrue(DeliveryStateFactory::from(DeliveryStatus::PICKED_UP)->canTransitionTo(DeliveryStatus::FAILED));
        $this->assertTrue(DeliveryStateFactory::from(DeliveryStatus::IN_TRANSIT)->canTransitionTo(DeliveryStatus::FAILED));
    }

    public function test_delivery_state_machine_blocks_backwards_and_terminal_transitions(): void
    {
        $this->assertFalse(DeliveryStateFactory::from(DeliveryStatus::IN_TRANSIT)->canTransitionTo(DeliveryStatus::PICKED_UP));
        $this->assertFalse(DeliveryStateFactory::from(DeliveryStatus::DELIVERED)->canTransitionTo(DeliveryStatus::FAILED));
        $this->assertFalse(DeliveryStateFactory::from(DeliveryStatus::FAILED)->canTransitionTo(DeliveryStatus::PENDING));
    }
}
