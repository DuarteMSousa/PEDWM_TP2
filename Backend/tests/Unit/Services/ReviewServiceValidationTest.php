<?php

namespace Tests\Unit\Services;

use App\Services\ReviewService\ReviewService;
use Illuminate\Validation\ValidationException;
use ReflectionClass;
use Tests\TestCase;

class ReviewServiceValidationTest extends TestCase
{
    public function test_accepts_valid_review_input(): void
    {
        $this->invoke(new ReviewService(), 'validateInput', [
            'rating' => 5,
            'target_type' => 'RESTAURANT',
            'target_id' => 'restaurant-1',
        ]);

        $this->assertTrue(true);
    }

    public function test_rejects_rating_outside_one_to_five(): void
    {
        $this->expectException(ValidationException::class);

        $this->invoke(new ReviewService(), 'validateInput', [
            'rating' => 6,
            'target_type' => 'RESTAURANT',
            'target_id' => 'restaurant-1',
        ]);
    }

    public function test_rejects_invalid_target_type(): void
    {
        $this->expectException(ValidationException::class);

        $this->invoke(new ReviewService(), 'validateInput', [
            'rating' => 4,
            'target_type' => 'ORDER',
            'target_id' => 'order-1',
        ]);
    }

    private function invoke(object $target, string $method, mixed ...$args): mixed
    {
        $reflection = new ReflectionClass($target);
        $reflectedMethod = $reflection->getMethod($method);


        return $reflectedMethod->invoke($target, ...$args);
    }
}
