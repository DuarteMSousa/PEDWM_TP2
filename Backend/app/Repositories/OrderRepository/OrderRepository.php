<?php

namespace App\Repositories\OrderRepository;

use App\DTOs\Order\CreateOrderDTO;
use App\DTOs\Order\UpdateOrderDTO;
use App\Enums\OrderEventType;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

class OrderRepository implements OrderRepositoryInterface
{
    private array $defaultRelations = [
        'items.options',
        'address',
        'events',
        'discounts',
        'payment',
        'delivery',
    ];

    public function findById(string $id)
    {
        return Order::with($this->defaultRelations)->find($id);
    }

    public function findByUserId(string $userId, int $pageNumber, int $pageSize)
    {
        return Order::with($this->defaultRelations)
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->paginate($pageSize, ['*'], 'page', $pageNumber);
    }

    public function findByRestaurantId(string $restaurantId, int $pageNumber, int $pageSize)
    {
        return Order::with($this->defaultRelations)
            ->where('restaurant_id', $restaurantId)
            ->orderByDesc('created_at')
            ->paginate($pageSize, ['*'], 'page', $pageNumber);
    }

    public function createOrder(CreateOrderDTO $data)
    {
        $order = Order::create($data->toArray());

        foreach ($data->items as $itemDTO) {
            $orderItem = $order->items()->create($itemDTO->toArray());

            if ($itemDTO->options === null) {
                continue;
            }

            foreach ($itemDTO->options as $optionDTO) {
                $orderItem->options()->create($optionDTO->toArray());
            }
        }

        if ($data->address !== null) {
            $order->address()->create($data->address->toArray());
        }

        if ($data->events !== null && $data->events->count() > 0) {
            foreach ($data->events as $eventDTO) {
                $eventData = $eventDTO->toArray();
                $eventData['timestamp'] = $eventData['timestamp'] ?? now();
                $order->events()->create($eventData);
            }
        } else {
            // talvez devesser colocado na camada de service
            $order->events()->create([
                'event_type' => OrderEventType::ORDER_CREATED->value,
                'timestamp' => now(),
                'payload' => null,
            ]);
        }

        if ($data->discounts !== null) {
            foreach ($data->discounts as $discountDTO) {
                $order->discounts()->create($discountDTO->toArray());
            }
        }

        return $order->load($this->defaultRelations);
    }

    public function updateOrder(string $id, UpdateOrderDTO $data)
    {
        $order = Order::with($this->defaultRelations)->find($id);

        if (!$order) {
            return null;
        }

        $order->update($data->toArray());

        return $order->load($this->defaultRelations);
    }

    public function deleteOrder(string $id)
    {
        $order = Order::find($id);

        if (!$order) {
            return false;
        }

        $order->delete();

        return true;
    }
}
