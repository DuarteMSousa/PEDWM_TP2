<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrderItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'order_id',
        'restaurant_product_id',
        'status',
        'quantity',
        'unit_price',
        'product_name_snapshot',
        'total_price',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'float',
            'total_price' => 'float',
            'status' => \App\Enums\OrderItemStatus::class,
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function restaurantProduct(): BelongsTo
    {
        return $this->belongsTo(RestaurantProduct::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(OrderItemOption::class);
    }

    public function discounts(): HasMany
    {
        return $this->hasMany(OrderDiscount::class);
    }
}
