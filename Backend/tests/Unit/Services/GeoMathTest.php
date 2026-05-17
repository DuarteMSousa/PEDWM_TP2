<?php

namespace Tests\Unit\Services;

use App\Domain\Geo\GeoMath;
use PHPUnit\Framework\TestCase;

class GeoMathTest extends TestCase
{
    public function test_distance_between_same_point_is_zero(): void
    {
        $this->assertSame(0.0, GeoMath::distanceKm(41.1496, -8.6109, 41.1496, -8.6109));
    }

    public function test_distance_between_porto_and_lisbon_is_in_expected_range(): void
    {
        $distance = GeoMath::distanceKm(41.1496, -8.6109, 38.7223, -9.1393);

        $this->assertGreaterThan(270, $distance);
        $this->assertLessThan(280, $distance);
    }

    public function test_fallback_route_returns_two_points_distance_and_duration(): void
    {
        $route = GeoMath::fallbackRoute(41.1496, -8.6109, 41.1579, -8.6291);

        $this->assertSame('fallback', $route['provider']);
        $this->assertCount(2, $route['points']);
        $this->assertSame(['lat' => 41.1496, 'lng' => -8.6109], $route['points'][0]);
        $this->assertSame(['lat' => 41.1579, 'lng' => -8.6291], $route['points'][1]);
        $this->assertGreaterThan(0, $route['distance_km']);
        $this->assertGreaterThanOrEqual(60, $route['duration_seconds']);
    }
}
