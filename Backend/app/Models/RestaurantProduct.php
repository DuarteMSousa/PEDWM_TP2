<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RestaurantProduct extends Model
{
    use HasUuids;

    protected $fillable = [
        'restaurant_id',
        'product_id',
        'local_price',
        'is_available',
        'estimated_preparation_time_min',
    ];

    protected function casts(): array
    {
        return [
            'local_price' => 'float',
            'is_available' => 'boolean',
            'estimated_preparation_time_min' => 'integer',
        ];
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
