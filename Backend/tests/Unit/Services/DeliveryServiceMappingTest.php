<?php

namespace Tests\Unit\Services;

use App\Enums\DeliveryEventType;
use App\Enums\DeliveryStatus;
use App\Services\DeliveryService\DeliveryService;
use ReflectionClass;
use Tests\TestCase;

class DeliveryServiceMappingTest extends TestCase
{
    public function test_maps_delivery_status_to_event_type(): void
    {
        $service = new DeliveryService();

        $this->assertSame(
            DeliveryEventType::DELIVERY_PICKED_UP,
            $this->invoke($service, 'eventTypeForStatus', DeliveryStatus::PICKED_UP)
        );
        $this->assertSame(
            DeliveryEventType::DELIVERY_IN_TRANSIT,
            $this->invoke($service, 'eventTypeForStatus', DeliveryStatus::IN_TRANSIT)
        );
        $this->assertSame(
            DeliveryEventType::DELIVERY_DELIVERED,
            $this->invoke($service, 'eventTypeForStatus', DeliveryStatus::DELIVERED)
        );
        $this->assertSame(
            DeliveryEventType::DELIVERY_FAILED,
            $this->invoke($service, 'eventTypeForStatus', DeliveryStatus::FAILED)
        );
    }

    private function invoke(object $target, string $method, mixed ...$args): mixed
    {
        $reflection = new ReflectionClass($target);
        $reflectedMethod = $reflection->getMethod($method);


        return $reflectedMethod->invoke($target, ...$args);
    }
}
