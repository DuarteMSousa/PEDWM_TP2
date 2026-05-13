<?php

namespace App\DTOs\Order\OrderItem;

use App\DTOs\Order\OrderItemOption\CreateOrderItemOptionDTO;
use App\Enums\OrderItemStatus;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;

class CreateOrderItemDTO extends Data
{
    public function __construct(
        public readonly string $restaurant_product_id,
        public readonly OrderItemStatus $status,
        public readonly int $quantity,
        public readonly float $unit_price,
        public readonly string $product_name_snapshot,
        public readonly float $total_price,
        #[DataCollectionOf(CreateOrderItemOptionDTO::class)]
        public readonly ?DataCollection $options = null,
    ) {
    }

    public function toArray(): array
    {
        return [
            'restaurant_product_id' => $this->restaurant_product_id,
            'status' => $this->status->value,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'product_name_snapshot' => $this->product_name_snapshot,
            'total_price' => $this->total_price,
        ];
    }
}
