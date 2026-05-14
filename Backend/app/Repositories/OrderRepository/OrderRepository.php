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

    public function findByUserIdWithFilters(string $userId, int $limit, ?array $statuses = null)
    {
        $query = Order::with($this->defaultRelations)
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit($limit);

        if ($statuses !== null && count($statuses) > 0) {
            $query->whereIn('status', $statuses);
        }

        return $query->get();
    }

    public function createOrder(CreateOrderDTO $data)
    {
        $order = Order::create([
            'user_id' => $data->user_id,
            'restaurant_id' => $data->restaurant_id,
            'status' => $data->status,
            'total' => $data->total,
            'restaurant_name_snapshot' => $data->restaurant_name_snapshot,
        ]);

        foreach ($data->items as $itemDTO) {
            $orderItem = $order->items()->create([
                'restaurant_product_id' => $itemDTO->restaurant_product_id,
                'status' => $itemDTO->status,
                'quantity' => $itemDTO->quantity,
                'unit_price' => $itemDTO->unit_price,
                'product_name_snapshot' => $itemDTO->product_name_snapshot,
                'total_price' => $itemDTO->total_price,
            ]);

            if ($itemDTO->options === null) {
                continue;
            }

            foreach ($itemDTO->options as $optionDTO) {
                $orderItem->options()->create([
                    'product_option_id' => $optionDTO->product_option_id,
                    'option_name_snapshot' => $optionDTO->option_name_snapshot,
                    'extra_price' => $optionDTO->extra_price,
                ]);
            }
        }

        if ($data->address !== null) {
            $order->address()->create([
                'street' => $data->address->street,
                'city' => $data->address->city,
                'postal_code' => $data->address->postal_code,
                'country' => $data->address->country,
                'latitude' => $data->address->latitude,
                'longitude' => $data->address->longitude,
            ]);
        }

        if ($data->events !== null && $data->events->count() > 0) {
            foreach ($data->events as $eventDTO) {
                $order->events()->create([
                    'event_type' => $eventDTO->event_type,
                    'timestamp' => $eventDTO->timestamp ?? now(),
                    'payload' => $eventDTO->payload,
                ]);
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
                $order->discounts()->create([
                    'name_snapshot' => $discountDTO->name_snapshot,
                    'description_snapshot' => $discountDTO->description_snapshot,
                    'discount_amount' => $discountDTO->discount_amount,
                    'discount_type' => $discountDTO->discount_type,
                    'discount_target' => $discountDTO->discount_target,
                    'order_item_id' => $discountDTO->order_item_id,
                    'origin_type' => $discountDTO->origin_type,
                    'origin_id' => $discountDTO->origin_id,
                ]);
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

        $order->update([
            'status' => $data->status,
        ]);

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
