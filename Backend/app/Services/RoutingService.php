<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class RoutingService
{
    /**
     * @return array{points: array<int, array{lat: float, lng: float}>, distance_km: float|null, duration_seconds: int|null, provider: string}
     */
    public function routeBetween(?float $originLat, ?float $originLng, ?float $destinationLat, ?float $destinationLng): array
    {
        if ($originLat === null || $originLng === null || $destinationLat === null || $destinationLng === null) {
            return [
                'points' => [],
                'distance_km' => null,
                'duration_seconds' => null,
                'provider' => 'none',
            ];
        }

        $fallback = $this->fallbackRoute($originLat, $originLng, $destinationLat, $destinationLng);

        if (! config('services.osrm.enabled', true)) {
            return $fallback;
        }

        $cacheKey = sprintf(
            'osrm:route:%s:%s:%s:%s',
            round($originLat, 4),
            round($originLng, 4),
            round($destinationLat, 4),
            round($destinationLng, 4)
        );

        return Cache::remember($cacheKey, now()->addSeconds((int) config('services.osrm.cache_seconds', 20)), function () use (
            $originLat,
            $originLng,
            $destinationLat,
            $destinationLng,
            $fallback
        ): array {
            try {
                $baseUrl = rtrim((string) config('services.osrm.base_url', 'https://router.project-osrm.org'), '/');
                $profile = (string) config('services.osrm.profile', 'driving');

                $coordinates = sprintf(
                    '%s,%s;%s,%s',
                    $originLng,
                    $originLat,
                    $destinationLng,
                    $destinationLat
                );

                $response = Http::timeout((int) config('services.osrm.timeout_seconds', 3))
                    ->acceptJson()
                    ->get("{$baseUrl}/route/v1/{$profile}/{$coordinates}", [
                        'overview' => 'full',
                        'geometries' => 'geojson',
                        'steps' => 'false',
                        'alternatives' => 'false',
                    ]);

                if (! $response->ok()) {
                    return $fallback;
                }

                $route = data_get($response->json(), 'routes.0');

                if (! is_array($route)) {
                    return $fallback;
                }

                $coordinates = data_get($route, 'geometry.coordinates', []);

                $points = collect($coordinates)
                    ->filter(fn ($pair) => is_array($pair) && count($pair) >= 2)
                    ->map(fn ($pair): array => [
                        'lat' => (float) $pair[1],
                        'lng' => (float) $pair[0],
                    ])
                    ->values()
                    ->all();

                if (empty($points)) {
                    return $fallback;
                }

                return [
                    'points' => $points,
                    'distance_km' => round(((float) data_get($route, 'distance', 0)) / 1000, 2),
                    'duration_seconds' => max(1, (int) round((float) data_get($route, 'duration', 0))),
                    'provider' => 'osrm',
                ];
            } catch (\Throwable) {
                return $fallback;
            }
        });
    }

    /**
     * @return array{points: array<int, array{lat: float, lng: float}>, distance_km: float|null, duration_seconds: int|null, provider: string}
     */
    private function fallbackRoute(float $originLat, float $originLng, float $destinationLat, float $destinationLng): array
    {
        $distanceKm = $this->haversineKm($originLat, $originLng, $destinationLat, $destinationLng);

        return [
            'points' => [
                ['lat' => $originLat, 'lng' => $originLng],
                ['lat' => $destinationLat, 'lng' => $destinationLng],
            ],
            'distance_km' => round($distanceKm, 2),
            'duration_seconds' => max(60, (int) round(($distanceKm / 25) * 3600)),
            'provider' => 'fallback',
        ];
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadiusKm * $c;
    }
}
