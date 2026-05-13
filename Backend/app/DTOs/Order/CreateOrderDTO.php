<?php

namespace App\DTOs\Order;

use App\DTOs\Order\OrderAddress\CreateOrderAddressDTO;
use App\DTOs\Order\OrderDiscount\CreateOrderDiscountDTO;
use App\DTOs\Order\OrderEvent\CreateOrderEventDTO;
use App\DTOs\Order\OrderItem\CreateOrderItemDTO;
use App\Enums\OrderStatus;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;

class CreateOrderDTO extends Data
{
    public function __construct(
        public readonly string $user_id,
        public readonly string $restaurant_id,
        public readonly OrderStatus $status,
        public readonly float $total,
        public readonly string $restaurant_name_snapshot,
        #[DataCollectionOf(CreateOrderItemDTO::class)]
        public readonly DataCollection $items,
        public readonly ?CreateOrderAddressDTO $address = null,
        #[DataCollectionOf(CreateOrderEventDTO::class)]
        public readonly ?DataCollection $events = null,
        #[DataCollectionOf(CreateOrderDiscountDTO::class)]
        public readonly ?DataCollection $discounts = null,
    ) {
    }

    public function toArray(): array
    {
        return [
            'user_id' => $this->user_id,
            'restaurant_id' => $this->restaurant_id,
            'status' => $this->status->value,
            'total' => $this->total,
            'restaurant_name_snapshot' => $this->restaurant_name_snapshot,
        ];
    }
}
