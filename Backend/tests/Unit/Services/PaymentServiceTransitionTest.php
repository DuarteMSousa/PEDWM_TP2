<?php

namespace Tests\Unit\Services;

use App\Domain\StateMachines\Payments\PaymentStateFactory;
use App\Enums\PaymentStatus;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PaymentServiceTransitionTest extends TestCase
{
    public function test_allows_pending_to_completed_failed_or_cancelled(): void
    {
        $state = PaymentStateFactory::from(PaymentStatus::PENDING);

        $this->assertTrue($state->canTransitionTo(PaymentStatus::COMPLETED));
        $this->assertTrue($state->canTransitionTo(PaymentStatus::FAILED));
        $this->assertTrue($state->canTransitionTo(PaymentStatus::CANCELLED));
    }

    public function test_rejects_transition_from_completed_payment(): void
    {
        $state = PaymentStateFactory::from(PaymentStatus::COMPLETED);

        $this->assertFalse($state->canTransitionTo(PaymentStatus::FAILED));

        $this->expectException(ValidationException::class);

        $state->transition(new \App\Models\Payment(['status' => PaymentStatus::COMPLETED]), PaymentStatus::FAILED);
    }
}
