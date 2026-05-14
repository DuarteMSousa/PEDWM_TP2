<?php

namespace App\GraphQL\Queries;

use App\Enums\UserType;
use App\Models\Order;
use App\Models\User;
use App\Services\RoutingService;
use GraphQL\Error\UserError;
use Illuminate\Auth\AuthenticationException;

class TrackingQueries
{
    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function orderTracking(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        /** @var Order|null $order */
        $order = Order::query()
            ->with([
                'restaurant.localManager',
                'restaurant.address',
                'restaurant.chain.chainManagers',
                'user',
                'address',
                'delivery.courier',
                'delivery.positionHistory' => fn ($query) => $query->orderByDesc('timestamp')->limit(20),
                'events' => fn ($query) => $query->orderByDesc('timestamp')->limit(20),
            ])
            ->whereKey($args['order_id'])
            ->first();

        if (! $order) {
            throw new UserError('Order not found.');
        }

        if (! $this->canAccessOrderTracking($user, $order)) {
            throw new UserError('Not authorized to access this order tracking.');
        }

        $delivery = $order->delivery;
        $courier = $delivery?->courier;

        $positions = $delivery?->positionHistory
            ->map(fn ($position): array => [
                'lat' => (float) $position->latitude,
                'lng' => (float) $position->longitude,
                'recorded_at' => $position->timestamp?->toIso8601String(),
            ])
            ->values()
            ->all() ?? [];

        $latestPosition = $positions[0] ?? null;

        if (! $latestPosition && $courier && $courier->latitude !== null && $courier->longitude !== null) {
            $latestPosition = [
                'lat' => (float) $courier->latitude,
                'lng' => (float) $courier->longitude,
                'recorded_at' => $courier->last_location_update?->toIso8601String(),
            ];
        }

        $events = $order->events
            ->map(fn ($event): array => [
                'event_type' => $event->event_type->value,
                'timestamp' => $event->timestamp?->toIso8601String(),
            ])
            ->values()
            ->all();

        $pickupLat = $order->restaurant?->address?->latitude;
        $pickupLng = $order->restaurant?->address?->longitude;
        $dropoffLat = $order->address?->latitude;
        $dropoffLng = $order->address?->longitude;

        $routeOriginLat = $latestPosition['lat'] ?? $pickupLat;
        $routeOriginLng = $latestPosition['lng'] ?? $pickupLng;

        $routeData = app(RoutingService::class)->routeBetween(
            $routeOriginLat !== null ? (float) $routeOriginLat : null,
            $routeOriginLng !== null ? (float) $routeOriginLng : null,
            $dropoffLat !== null ? (float) $dropoffLat : null,
            $dropoffLng !== null ? (float) $dropoffLng : null
        );

        $distanceRemaining = null;
        $etaSeconds = null;

        if ($routeData['distance_km'] !== null) {
            $distanceRemaining = (float) $routeData['distance_km'];
        }

        if ($routeData['duration_seconds'] !== null) {
            $etaSeconds = (int) $routeData['duration_seconds'];
        }

        return [
            'order_id' => $order->id,
            'order_status' => $order->status->value,
            'delivery_id' => $delivery?->id,
            'delivery_status' => $delivery?->status?->value,
            'courier_id' => $delivery?->courier_id,
            'restaurant_name' => $order->restaurant_name_snapshot ?? $order->restaurant?->name,
            'customer_name' => $order->user?->name,
            'courier_latitude' => $courier?->latitude,
            'courier_longitude' => $courier?->longitude,
            'last_location_update' => $courier?->last_location_update?->toIso8601String(),
            'pickup_latitude' => $pickupLat,
            'pickup_longitude' => $pickupLng,
            'dropoff_latitude' => $dropoffLat,
            'dropoff_longitude' => $dropoffLng,
            'route_provider' => $routeData['provider'],
            'route_distance_km' => $routeData['distance_km'],
            'route_duration_seconds' => $routeData['duration_seconds'],
            'route_points' => $routeData['points'],
            'distance_km_remaining' => $distanceRemaining !== null ? round($distanceRemaining, 2) : null,
            'eta_seconds' => $etaSeconds,
            'latest_position' => $latestPosition,
            'positions' => $positions,
            'events' => $events,
        ];
    }

    private function resolveAuthenticatedUser(): User
    {
        $user = auth()->user();

        if (! $user && app()->environment(['local', 'testing'])) {
            $devUserId = request()->header('X-Dev-User-Id');
            if ($devUserId) {
                $user = User::query()->find($devUserId);
            }
        }

        if (! $user) {
            throw new AuthenticationException('Authentication required.');
        }

        return $user;
    }

    private function canAccessOrderTracking(User $user, Order $order): bool
    {
        if ($user->user_type === UserType::CUSTOMER) {
            return $order->user_id === $user->id;
        }

        if ($user->user_type === UserType::COURIER) {
            return $order->delivery?->courier_id === $user->id;
        }

        if ($user->user_type === UserType::LOCAL_MANAGER) {
            return $order->restaurant?->localManager?->user_id === $user->id;
        }

        if ($user->user_type === UserType::CHAIN_MANAGER) {
            return $order->restaurant?->chain?->chainManagers
                ?->contains(fn ($manager) => $manager->user_id === $user->id) ?? false;
        }

        return false;
    }
}
