<?php

namespace App\Domain\Geo;

final class GeoMath
{
    public static function distanceKm(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $earthRadiusKm = 6371;
        $dLat = deg2rad($toLat - $fromLat);
        $dLng = deg2rad($toLng - $fromLng);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * sin($dLng / 2) ** 2;

        return $earthRadiusKm * (2 * atan2(sqrt($a), sqrt(1 - $a)));
    }

    /**
     * @return array{points: array<int, array{lat: float, lng: float}>, distance_km: float|null, duration_seconds: int|null, provider: string}
     */
    public static function fallbackRoute(float $originLat, float $originLng, float $destinationLat, float $destinationLng): array
    {
        $distanceKm = self::distanceKm($originLat, $originLng, $destinationLat, $destinationLng);

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
}
