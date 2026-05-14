<?php

namespace App\GraphQL\Queries;

use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\User;
use App\Services\DeliveryOfferService\DeliveryOfferServiceInterface;
use GraphQL\Error\UserError;
use Illuminate\Auth\AuthenticationException;

class OperationsQueries
{
    public function __construct(private DeliveryOfferServiceInterface $deliveryOfferService)
    {
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, array<string, mixed>>
     */
    public function restaurantActiveOrders(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        if (! in_array($user->user_type, [UserType::LOCAL_MANAGER, UserType::CHAIN_MANAGER], true)) {
            throw new UserError('Only restaurant managers can access active orders.');
        }

        $restaurantIds = $this->resolveManagedRestaurantIds($user);

        if (empty($restaurantIds)) {
            return [];
        }

        if (isset($args['restaurant_id']) && $args['restaurant_id']) {
            if (! in_array($args['restaurant_id'], $restaurantIds, true)) {
                throw new UserError('Not authorized to access this restaurant.');
            }

            $restaurantIds = [$args['restaurant_id']];
        }

        $orders = Order::query()
            ->with(['delivery', 'user', 'address', 'items'])
            ->whereIn('restaurant_id', $restaurantIds)
            ->whereIn('status', [
                OrderStatus::PENDING->value,
                OrderStatus::CONFIRMED->value,
                OrderStatus::PREPARING->value,
                OrderStatus::READY->value,
                OrderStatus::OUT_FOR_DELIVERY->value,
            ])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return $orders
            ->map(fn ($order): array => [
                'order_id' => $order->id,
                'restaurant_id' => $order->restaurant_id,
                'customer_id' => $order->user_id,
                'customer_name' => $order->user?->name,
                'order_status' => $order->status->value,
                'total' => (float) $order->total,
                'delivery_address' => $this->formatAddress(
                    $order->address?->street,
                    $order->address?->city,
                    $order->address?->country
                ),
                'created_at' => $order->created_at?->toIso8601String(),
                'delivery_id' => $order->delivery?->id,
                'delivery_status' => $order->delivery?->status?->value,
                'courier_id' => $order->delivery?->courier_id,
                'items' => $order->items->map(fn ($item): array => [
                    'order_item_id' => $item->id,
                    'name' => $item->product_name_snapshot ?? 'Produto',
                    'quantity' => (int) $item->quantity,
                    'status' => $item->status->value,
                    'total_price' => (float) $item->total_price,
                ])->values()->all(),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, array<string, mixed>>
     */
    public function courierAvailableDeliveries(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        if ($user->user_type !== UserType::COURIER) {
            throw new UserError('Only courier users can access available deliveries.');
        }

        $limit = max(1, min((int) ($args['limit'] ?? 20), 100));
        $courier = $user->courier;
        if (! $courier) {
            throw new UserError('Courier profile not found.');
        }

        $deliveries = Delivery::query()
            ->with([
                'order.restaurant.address',
                'order.address',
            ])
            ->whereNull('courier_id')
            ->where('status', 'PENDING')
            ->whereHas('order', function ($query): void {
                $query->whereIn('status', [
                    OrderStatus::CONFIRMED->value,
                    OrderStatus::PREPARING->value,
                    OrderStatus::READY->value,
                ]);
            })
            ->orderByDesc('created_at')
            ->limit(max($limit * 3, 50))
            ->get();

        $offers = $deliveries
            ->map(function (Delivery $delivery) use ($courier): array {
                $order = $delivery->order;
                $pickupAddress = $order?->restaurant?->address;
                $dropoffAddress = $order?->address;
                $offer = $this->deliveryOfferService->issueOffer($delivery->id, $courier->user_id);
                if (! $offer) {
                    return null;
                }
                $distanceKm = $this->calculateDistanceKm(
                    $courier->latitude,
                    $courier->longitude,
                    $pickupAddress?->latitude,
                    $pickupAddress?->longitude
                );
                $etaMin = $distanceKm !== null ? max(1, (int) ceil(($distanceKm / 25) * 60)) : null;

                return [
                    'delivery_id' => $delivery->id,
                    'order_id' => $delivery->order_id,
                    'order_status' => $order?->status?->value ?? OrderStatus::PENDING->value,
                    'restaurant_name' => $order?->restaurant_name_snapshot ?? $order?->restaurant?->name ?? 'Restaurante',
                    'order_total' => (float) ($order?->total ?? 0),
                    'estimated_pickup_distance_km' => $distanceKm !== null ? round($distanceKm, 2) : null,
                    'estimated_pickup_time_min' => $etaMin,
                    'pickup_address' => $this->formatAddress(
                        $pickupAddress?->street,
                        $pickupAddress?->city,
                        $pickupAddress?->country
                    ),
                    'dropoff_address' => $this->formatAddress(
                        $dropoffAddress?->street,
                        $dropoffAddress?->city,
                        $dropoffAddress?->country
                    ),
                    'offer_token' => $offer['token'],
                    'offer_expires_at' => $offer['expires_at'],
                    'created_at' => $delivery->created_at?->toIso8601String(),
                ];
            })
            ->filter()
            ->values()
            ->all();

        usort($offers, function (array $a, array $b): int {
            $aDistance = $a['estimated_pickup_distance_km'];
            $bDistance = $b['estimated_pickup_distance_km'];

            if ($aDistance === null && $bDistance === null) {
                return strcmp((string) ($a['created_at'] ?? ''), (string) ($b['created_at'] ?? ''));
            }

            if ($aDistance === null) {
                return 1;
            }

            if ($bDistance === null) {
                return -1;
            }

            if ($aDistance === $bDistance) {
                return strcmp((string) ($a['created_at'] ?? ''), (string) ($b['created_at'] ?? ''));
            }

            return $aDistance <=> $bDistance;
        });

        return array_values(array_slice($offers, 0, $limit));
    }

    private function resolveManagedRestaurantIds(User $user): array
    {
        if ($user->user_type === UserType::LOCAL_MANAGER) {
            $restaurantId = $user->localManager?->restaurant_id;
            return $restaurantId ? [$restaurantId] : [];
        }

        if ($user->user_type === UserType::CHAIN_MANAGER) {
            $chainId = $user->chainManager?->chain_id;
            if (! $chainId) {
                return [];
            }

            return $user->chainManager
                ->chain
                ?->restaurants()
                ->pluck('id')
                ->toArray() ?? [];
        }

        return [];
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

        return $user->loadMissing(['localManager', 'chainManager.chain.restaurants']);
    }

    private function formatAddress(?string $street, ?string $city, ?string $country): ?string
    {
        $parts = array_filter([$street, $city, $country], fn ($part) => ! is_null($part) && trim($part) !== '');

        if (empty($parts)) {
            return null;
        }

        return implode(', ', $parts);
    }

    private function calculateDistanceKm(?float $lat1, ?float $lng1, ?float $lat2, ?float $lng2): ?float
    {
        if ($lat1 === null || $lng1 === null || $lat2 === null || $lng2 === null) {
            return null;
        }

        $earthRadiusKm = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadiusKm * $c;
    }

}
