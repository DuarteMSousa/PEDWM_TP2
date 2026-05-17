<?php

namespace Tests\Unit\Services;

use App\Services\RoutingService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RoutingServiceTest extends TestCase
{
    public function test_returns_empty_route_when_coordinates_are_missing(): void
    {
        $route = (new RoutingService())->routeBetween(null, -8.6109, 41.1579, -8.6291);

        $this->assertSame('none', $route['provider']);
        $this->assertSame([], $route['points']);
        $this->assertNull($route['distance_km']);
        $this->assertNull($route['duration_seconds']);
    }

    public function test_returns_fallback_route_when_osrm_is_disabled(): void
    {
        Config::set('services.osrm.enabled', false);

        $route = (new RoutingService())->routeBetween(41.1496, -8.6109, 41.1579, -8.6291);

        $this->assertSame('fallback', $route['provider']);
        $this->assertCount(2, $route['points']);
        $this->assertGreaterThan(0, $route['distance_km']);
    }

    public function test_returns_osrm_route_when_provider_responds_successfully(): void
    {
        Cache::flush();
        Config::set('services.osrm.enabled', true);
        Config::set('services.osrm.base_url', 'https://osrm.test');

        Http::fake([
            'osrm.test/*' => Http::response([
                'routes' => [[
                    'distance' => 1250,
                    'duration' => 420,
                    'geometry' => [
                        'coordinates' => [
                            [-8.6109, 41.1496],
                            [-8.6291, 41.1579],
                        ],
                    ],
                ]],
            ]),
        ]);

        $route = (new RoutingService())->routeBetween(41.1496, -8.6109, 41.1579, -8.6291);

        $this->assertSame('osrm', $route['provider']);
        $this->assertSame(1.25, $route['distance_km']);
        $this->assertSame(420, $route['duration_seconds']);
        $this->assertSame(['lat' => 41.1496, 'lng' => -8.6109], $route['points'][0]);
    }

    public function test_falls_back_when_osrm_fails(): void
    {
        Cache::flush();
        Config::set('services.osrm.enabled', true);
        Config::set('services.osrm.base_url', 'https://osrm.test');

        Http::fake([
            'osrm.test/*' => Http::response([], 500),
        ]);

        $route = (new RoutingService())->routeBetween(41.1496, -8.6109, 41.1579, -8.6291);

        $this->assertSame('fallback', $route['provider']);
        $this->assertCount(2, $route['points']);
    }
}
