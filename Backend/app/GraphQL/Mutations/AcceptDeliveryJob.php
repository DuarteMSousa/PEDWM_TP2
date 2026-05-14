<?php

namespace App\GraphQL\Mutations;

use App\Enums\CourierStatus;
use App\Enums\DeliveryStatus;
use App\Enums\OrderEventType;
use App\Enums\UserType;
use App\Models\Courier;
use App\Models\Delivery;
use App\Models\User;
use App\Services\DeliveryOfferService\DeliveryOfferServiceInterface;
use App\Services\IdempotencyService;
use GraphQL\Error\UserError;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\DB;

class AcceptDeliveryJob
{
    public function __construct(private DeliveryOfferServiceInterface $deliveryOfferService)
    {
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        if ($user->user_type !== UserType::COURIER) {
            throw new UserError('Only courier users can accept delivery jobs.');
        }

        $courier = Courier::query()->whereKey($user->id)->first();

        if (! $courier) {
            throw new UserError('Courier profile not found.');
        }

        if ($courier->status !== CourierStatus::AVAILABLE) {
            throw new UserError('Courier must be AVAILABLE to accept a delivery job.');
        }

        $input = $args['input'];

        return app(IdempotencyService::class)->execute(
            user: $user,
            operation: 'accept_delivery_job',
            requestPayload: $input,
            callback: function () use ($input, $user, $courier): array {
                $deliveryId = $input['delivery_id'];
                $offerToken = $input['offer_token'];
                $assignedDelivery = null;

                DB::transaction(function () use ($deliveryId, $offerToken, $user, $courier, &$assignedDelivery): void {
                    if (! $this->deliveryOfferService->validateOffer($deliveryId, $user->id, $offerToken)) {
                        throw new UserError('Delivery offer is invalid or expired. Request a new offer.');
                    }

                    /** @var Delivery|null $delivery */
                    $delivery = Delivery::query()
                        ->with('order')
                        ->whereKey($deliveryId)
                        ->lockForUpdate()
                        ->first();

                    if (! $delivery) {
                        throw new UserError('Delivery not found.');
                    }

                    if ($delivery->status !== DeliveryStatus::PENDING) {
                        throw new UserError('Delivery is not pending and cannot be accepted.');
                    }

                    if ($delivery->courier_id !== null && $delivery->courier_id !== $user->id) {
                        throw new UserError('Delivery job already claimed by another courier.');
                    }

                    $delivery->update([
                        'courier_id' => $user->id,
                        'status' => DeliveryStatus::PENDING,
                    ]);

                    $courier->update(['status' => CourierStatus::BUSY]);
                    $this->deliveryOfferService->consumeOffer($deliveryId, $user->id);

                    $delivery->order->events()->create([
                        'event_type' => OrderEventType::ORDER_COURIER_ASSIGNED->value,
                        'timestamp' => now(),
                        'payload' => [
                            'delivery_id' => $delivery->id,
                            'courier_id' => $user->id,
                        ],
                    ]);

                    $assignedDelivery = $delivery->fresh(['order']);
                });

                return [
                    'ok' => true,
                    'delivery_id' => $assignedDelivery->id,
                    'order_id' => $assignedDelivery->order_id,
                    'courier_id' => $assignedDelivery->courier_id,
                    'delivery_status' => $assignedDelivery->status->value,
                ];
            }
        );
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

}
