<?php

namespace App\GraphQL\Mutations;

use App\Enums\DeliveryStatus;
use App\Enums\OrderEventType;
use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Models\Delivery;
use App\Models\User;
use Carbon\Carbon;
use GraphQL\Error\UserError;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\DB;

class UpdateDeliveryStatus
{
    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        if ($user->user_type !== UserType::COURIER) {
            throw new UserError('Only courier users can update delivery status.');
        }

        $input = $args['input'];

        /** @var Delivery|null $delivery */
        $delivery = Delivery::query()
            ->with('order')
            ->whereKey($input['delivery_id'])
            ->where('courier_id', $user->id)
            ->first();

        if (! $delivery) {
            throw new UserError('Delivery not found for this courier.');
        }

        $nextStatus = DeliveryStatus::from($input['status']);
        $currentStatus = $delivery->status;

        if (! $this->canTransition($currentStatus, $nextStatus)) {
            throw new UserError("Invalid delivery status transition: {$currentStatus->value} -> {$nextStatus->value}");
        }

        $recordedAt = isset($input['recorded_at']) && $input['recorded_at']
            ? Carbon::parse($input['recorded_at'])
            : now();

        $eventType = null;

        DB::transaction(function () use ($delivery, $nextStatus, $recordedAt, &$eventType): void {
            $deliveryData = ['status' => $nextStatus];
            $order = $delivery->order;

            if ($nextStatus === DeliveryStatus::PICKED_UP && ! $delivery->pickup_time) {
                $deliveryData['pickup_time'] = $recordedAt;
            }

            if ($nextStatus === DeliveryStatus::DELIVERED) {
                $deliveryData['delivery_time'] = $recordedAt;
            }

            if ($nextStatus === DeliveryStatus::PICKED_UP || $nextStatus === DeliveryStatus::IN_TRANSIT) {
                $order->update(['status' => OrderStatus::OUT_FOR_DELIVERY]);
                $eventType = OrderEventType::ORDER_OUT_FOR_DELIVERY;
            } elseif ($nextStatus === DeliveryStatus::DELIVERED) {
                $order->update(['status' => OrderStatus::DELIVERED]);
                $eventType = OrderEventType::ORDER_COMPLETED;
            } elseif ($nextStatus === DeliveryStatus::FAILED) {
                $order->update(['status' => OrderStatus::CANCELLED]);
                $eventType = OrderEventType::ORDER_CANCELLED;
            }

            $delivery->update($deliveryData);

            if ($eventType !== null) {
                $order->events()->create([
                    'event_type' => $eventType->value,
                    'timestamp' => $recordedAt,
                    'payload' => [
                        'delivery_id' => $delivery->id,
                        'delivery_status' => $nextStatus->value,
                        'courier_id' => $delivery->courier_id,
                    ],
                ]);
            }
        });

        $delivery->refresh();
        $delivery->load('order');

        return [
            'ok' => true,
            'delivery_id' => $delivery->id,
            'order_id' => $delivery->order_id,
            'delivery_status' => $delivery->status->value,
            'order_status' => $delivery->order->status->value,
            'recorded_at' => $recordedAt->toIso8601String(),
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

    private function canTransition(DeliveryStatus $from, DeliveryStatus $to): bool
    {
        return match ($from) {
            DeliveryStatus::PENDING => in_array($to, [DeliveryStatus::PICKED_UP, DeliveryStatus::FAILED], true),
            DeliveryStatus::PICKED_UP => in_array($to, [DeliveryStatus::IN_TRANSIT, DeliveryStatus::FAILED], true),
            DeliveryStatus::IN_TRANSIT => in_array($to, [DeliveryStatus::DELIVERED, DeliveryStatus::FAILED], true),
            DeliveryStatus::DELIVERED, DeliveryStatus::FAILED => false,
        };
    }
}
