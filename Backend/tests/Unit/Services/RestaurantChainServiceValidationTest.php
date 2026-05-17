<?php

namespace Tests\Unit\Services;

use App\Services\RestaurantChainService\RestaurantChainService;
use Illuminate\Validation\ValidationException;
use ReflectionClass;
use Tests\TestCase;

class RestaurantChainServiceValidationTest extends TestCase
{
    public function test_accepts_chain_name(): void
    {
        $this->invoke(new RestaurantChainService(), 'validateInput', ['name' => 'FastBite']);

        $this->assertTrue(true);
    }

    public function test_rejects_empty_chain_name(): void
    {
        $this->expectException(ValidationException::class);

        $this->invoke(new RestaurantChainService(), 'validateInput', ['name' => '']);
    }

    private function invoke(object $target, string $method, mixed ...$args): mixed
    {
        $reflection = new ReflectionClass($target);
        $reflectedMethod = $reflection->getMethod($method);


        return $reflectedMethod->invoke($target, ...$args);
    }
}
