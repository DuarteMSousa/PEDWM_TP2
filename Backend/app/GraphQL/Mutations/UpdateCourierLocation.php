<?php

namespace App\GraphQL\Mutations;

use App\Events\CourierPositionUpdated;
use App\Models\Courier;
use App\Models\CourierPositionHistory;
use App\Models\Delivery;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class UpdateCourierLocation
{
    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
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

        if ($user->user_type !== 'courier') {
            throw new RuntimeException('Only courier users can update location.');
        }

        $input = $args['input'];

        /** @var Delivery|null $delivery */
        $delivery = Delivery::query()
            ->with('order')
            ->whereKey($input['delivery_id'])
            ->where('courier_id', $user->id)
            ->first();

        if (! $delivery) {
            throw new RuntimeException('Delivery not found for this courier.');
        }

        if (! in_array($delivery->status, ['pending', 'picked_up', 'in_transit'], true)) {
            throw new RuntimeException('Delivery is not active.');
        }

        $courier = Courier::query()->whereKey($user->id)->first();

        if (! $courier) {
            throw new RuntimeException('Courier profile not found.');
        }

        $recordedAt = isset($input['recorded_at']) && $input['recorded_at']
            ? Carbon::parse($input['recorded_at'])
            : now();

        DB::transaction(function () use ($courier, $delivery, $input, $recordedAt): void {
            $courier->update([
                'latitude' => $input['lat'],
                'longitude' => $input['lng'],
                'last_location_update' => $recordedAt,
            ]);

            CourierPositionHistory::query()->create([
                'delivery_id' => $delivery->id,
                'latitude' => $input['lat'],
                'longitude' => $input['lng'],
                'timestamp' => $recordedAt,
            ]);
        });

        $payload = [
            'eventId' => (string) Str::uuid(),
            'eventName' => 'COURIER_POSITION_UPDATED',
            'orderId' => $delivery->order_id,
            'deliveryId' => $delivery->id,
            'courierId' => $delivery->courier_id,
            'lat' => (float) $input['lat'],
            'lng' => (float) $input['lng'],
            'heading' => isset($input['heading']) ? (float) $input['heading'] : null,
            'speed' => isset($input['speed']) ? (float) $input['speed'] : null,
            'accuracy' => isset($input['accuracy']) ? (float) $input['accuracy'] : null,
            'recordedAt' => $recordedAt->toIso8601String(),
        ];

        event(new CourierPositionUpdated($payload));

        return [
            'ok' => true,
            'delivery_id' => $delivery->id,
            'order_id' => $delivery->order_id,
            'recorded_at' => $recordedAt->format('Y-m-d H:i:s'),
        ];
    }
}
