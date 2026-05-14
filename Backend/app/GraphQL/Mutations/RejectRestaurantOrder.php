<?php

namespace App\GraphQL\Mutations;

use App\Enums\NotificationType;
use App\Enums\OrderEventType;
use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Models\Order;
use App\Models\User;
use App\Services\NotificationService\NotificationServiceInterface;
use GraphQL\Error\UserError;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\DB;

class RejectRestaurantOrder
{
    public function __construct(private NotificationServiceInterface $notificationService)
    {
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        if (! in_array($user->user_type, [UserType::LOCAL_MANAGER, UserType::CHAIN_MANAGER], true)) {
            throw new UserError('Only restaurant managers can reject orders.');
        }

        $orderId = $args['input']['order_id'];
        $reason = isset($args['input']['reason']) ? trim((string) $args['input']['reason']) : null;
        $reason = $reason !== '' ? $reason : null;
        $updatedOrder = null;

        DB::transaction(function () use ($orderId, $user, $reason, &$updatedOrder): void {
            /** @var Order|null $order */
            $order = Order::query()
                ->with(['restaurant.localManager', 'restaurant.chain.chainManagers'])
                ->whereKey($orderId)
                ->lockForUpdate()
                ->first();

            if (! $order) {
                throw new UserError('Order not found.');
            }

            if (! $this->canManageOrder($user, $order)) {
                throw new UserError('Not authorized to manage this order.');
            }

            if ($order->status !== OrderStatus::PENDING) {
                throw new UserError('Only PENDING orders can be rejected.');
            }

            $order->update(['status' => OrderStatus::CANCELLED]);
            $order->events()->create([
                'event_type' => OrderEventType::ORDER_CANCELLED->value,
                'timestamp' => now(),
                'payload' => [
                    'actor_id' => $user->id,
                    'reason' => $reason,
                ],
            ]);

            $updatedOrder = $order->fresh();
        });

        $notificationMessage = $reason
            ? "O restaurante rejeitou o pedido. Motivo: {$reason}"
            : 'O restaurante rejeitou o pedido.';

        $this->notificationService->createAndDispatch(
            userId: $updatedOrder->user_id,
            type: NotificationType::ORDER_UPDATE,
            title: 'Pedido rejeitado',
            message: $notificationMessage,
            data: [
                'order_id' => $updatedOrder->id,
                'reason' => $reason,
            ],
            actorId: $user->id
        );

        return [
            'ok' => true,
            'order_id' => $updatedOrder->id,
            'status' => $updatedOrder->status->value,
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

    private function canManageOrder(User $user, Order $order): bool
    {
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
