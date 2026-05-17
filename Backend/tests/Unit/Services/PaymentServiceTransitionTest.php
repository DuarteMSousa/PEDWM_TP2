<?php

namespace Tests\Unit\Services;

use App\Enums\PaymentStatus;
use App\Services\PaymentService\PaymentService;
use Illuminate\Validation\ValidationException;
use ReflectionClass;
use Tests\TestCase;

class PaymentServiceTransitionTest extends TestCase
{
    public function test_allows_pending_to_completed_failed_or_cancelled(): void
    {
        $service = new PaymentService();

        $this->invoke($service, 'assertTransition', PaymentStatus::PENDING, PaymentStatus::COMPLETED);
        $this->invoke($service, 'assertTransition', PaymentStatus::PENDING, PaymentStatus::FAILED);
        $this->invoke($service, 'assertTransition', PaymentStatus::PENDING, PaymentStatus::CANCELLED);

        $this->assertTrue(true);
    }

    public function test_rejects_transition_from_completed_payment(): void
    {
        $this->expectException(ValidationException::class);

        $this->invoke(new PaymentService(), 'assertTransition', PaymentStatus::COMPLETED, PaymentStatus::FAILED);
    }

    private function invoke(object $target, string $method, mixed ...$args): mixed
    {
        $reflection = new ReflectionClass($target);
        $reflectedMethod = $reflection->getMethod($method);


        return $reflectedMethod->invoke($target, ...$args);
    }
}
