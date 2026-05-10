<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderDiscount extends Model
{
    use HasUuids;

    protected $fillable = [
        'order_id',
        'name_snapshot',
        'description_snapshot',
        'discount_amount',
        'discount_type',
        'discount_target',
        'order_item_id',
        'origin_type',
        'origin_id',
    ];

    protected function casts(): array
    {
        return [
            'discount_amount' => 'float',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
