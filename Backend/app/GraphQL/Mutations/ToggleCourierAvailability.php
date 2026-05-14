<?php

namespace App\GraphQL\Mutations;

use App\Enums\CourierStatus;
use App\Enums\DeliveryStatus;
use App\Enums\UserType;
use App\Models\Courier;
use App\Models\Delivery;
use App\Models\User;
use GraphQL\Error\UserError;
use Illuminate\Auth\AuthenticationException;

class ToggleCourierAvailability
{
    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        if ($user->user_type !== UserType::COURIER) {
            throw new UserError('Only courier users can toggle availability.');
        }

        $courier = Courier::query()->whereKey($user->id)->first();

        if (! $courier) {
            throw new UserError('Courier profile not found.');
        }

        $nextStatus = CourierStatus::from($args['input']['status']);

        if ($nextStatus === CourierStatus::AVAILABLE) {
            $hasActiveDeliveries = Delivery::query()
                ->where('courier_id', $user->id)
                ->whereIn('status', [
                    DeliveryStatus::PENDING->value,
                    DeliveryStatus::PICKED_UP->value,
                    DeliveryStatus::IN_TRANSIT->value,
                ])
                ->exists();

            if ($hasActiveDeliveries) {
                throw new UserError('Cannot set AVAILABLE while courier has active deliveries.');
            }
        }

        $courier->update(['status' => $nextStatus]);

        return [
            'ok' => true,
            'courier_id' => $courier->user_id,
            'status' => $courier->status->value,
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
}
