<?php

namespace Tests\Unit\Services;

use App\DTOs\UserAddress\UpdateUserAddressDTO;
use App\Services\UserAddressService\UserAddressService;
use Illuminate\Validation\ValidationException;
use ReflectionClass;
use Tests\TestCase;

class UserAddressServiceValidationTest extends TestCase
{
    public function test_accepts_valid_address_input(): void
    {
        $this->invoke(new UserAddressService(), 'validateInput', [
            'street' => 'Rua A',
            'city' => 'Porto',
            'postal_code' => '4000-000',
            'country' => 'PT',
            'latitude' => 41.1496,
            'longitude' => -8.6109,
        ]);

        $this->assertTrue(true);
    }

    public function test_rejects_missing_required_address_fields(): void
    {
        $this->expectException(ValidationException::class);

        $this->invoke(new UserAddressService(), 'validateInput', [
            'street' => '',
            'city' => 'Porto',
            'postal_code' => '4000-000',
            'country' => 'PT',
            'latitude' => 41.1496,
            'longitude' => -8.6109,
        ]);
    }

    public function test_update_payload_filters_null_values(): void
    {
        $payload = $this->invoke(new UserAddressService(), 'updatePayload', new UpdateUserAddressDTO(
            city: 'Lisboa',
            label: null,
        ));

        $this->assertSame(['city' => 'Lisboa'], $payload);
    }

    private function invoke(object $target, string $method, mixed ...$args): mixed
    {
        $reflection = new ReflectionClass($target);
        $reflectedMethod = $reflection->getMethod($method);


        return $reflectedMethod->invoke($target, ...$args);
    }
}
