<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CartItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'cart_id',
        'restaurant_product_id',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    public function restaurantProduct(): BelongsTo
    {
        return $this->belongsTo(RestaurantProduct::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(CartItemOption::class);
    }
}
