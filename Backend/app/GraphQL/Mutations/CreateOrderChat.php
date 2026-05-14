<?php

namespace App\GraphQL\Mutations;

use App\Enums\ChatType;
use App\Models\Chat;
use App\Models\Order;
use App\Support\ResolvesAuthenticatedUser;
use GraphQL\Error\UserError;
use Illuminate\Support\Facades\DB;

class CreateOrderChat
{
    use ResolvesAuthenticatedUser;

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $input = $args['input'];
        $chatType = ChatType::from($input['type']);

        /** @var Order|null $order */
        $order = Order::query()
            ->with(['user', 'restaurant.localManager', 'restaurant.chain.chainManagers', 'delivery'])
            ->whereKey($input['order_id'])
            ->first();

        if (! $order) {
            throw new UserError('Order not found.');
        }

        $participantIds = $this->resolveParticipantIds($order, $chatType);
        if (! in_array($user->id, $participantIds, true)) {
            throw new UserError('Not authorized to create this chat.');
        }

        $chat = DB::transaction(function () use ($order, $chatType, $participantIds): Chat {
            $existing = Chat::query()
                ->where('order_id', $order->id)
                ->where('type', $chatType)
                ->first();

            if ($existing) {
                return $existing;
            }

            $chat = Chat::query()->create([
                'order_id' => $order->id,
                'type' => $chatType,
            ]);

            foreach (array_unique($participantIds) as $participantId) {
                $participantUser = $participantId === $order->user_id
                    ? $order->user
                    : ($order->restaurant?->localManager?->user_id === $participantId
                        ? $order->restaurant?->localManager?->user
                        : null);

                if (! $participantUser) {
                    $participantUser = $order->restaurant?->chain?->chainManagers
                        ?->firstWhere('user_id', $participantId)?->user;
                }

                if (! $participantUser && $order->delivery?->courier_id === $participantId) {
                    $participantUser = $order->delivery?->courier?->user;
                }

                if (! $participantUser) {
                    continue;
                }

                $chat->participants()->create([
                    'user_id' => $participantId,
                    'user_type' => $participantUser->user_type,
                    'joined_at' => now(),
                    'last_read_at' => now(),
                ]);
            }

            return $chat;
        });

        return [
            'ok' => true,
            'chat_id' => $chat->id,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function resolveParticipantIds(Order $order, ChatType $chatType): array
    {
        $participants = [$order->user_id];

        if ($chatType === ChatType::CUSTOMER_RESTAURANT) {
            $localManagerId = $order->restaurant?->localManager?->user_id;
            if ($localManagerId) {
                $participants[] = $localManagerId;
            }

            foreach ($order->restaurant?->chain?->chainManagers ?? [] as $chainManager) {
                $participants[] = $chainManager->user_id;
            }
        }

        if ($chatType === ChatType::CUSTOMER_COURIER) {
            $courierId = $order->delivery?->courier_id;
            if (! $courierId) {
                throw new UserError('Delivery is not assigned to a courier yet.');
            }
            $participants[] = $courierId;
        }

        return array_values(array_unique(array_filter($participants)));
    }
}

