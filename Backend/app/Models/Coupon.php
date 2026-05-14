<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    use HasUuids;

    protected $fillable = [
        'chain_id',
        'code',
        'description',
        'type',
        'target',
        'product_id',
        'category_id',
        'discount',
        'min_order_total',
        'max_discount_amount',
        'max_uses',
        'used_count',
        'expiry_date',
    ];

    protected function casts(): array
    {
        return [
            'expiry_date' => 'datetime',
            'discount' => 'float',
            'min_order_total' => 'float',
            'max_discount_amount' => 'float',
            'max_uses' => 'integer',
            'used_count' => 'integer',
        ];
    }

    public function chain(): BelongsTo
    {
        return $this->belongsTo(RestaurantChain::class, 'chain_id');
    }

    public function promotionItems(): HasMany
    {
        return $this->hasMany(PromotionItem::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function orderDiscounts(): HasMany
    {
        return $this->hasMany(OrderDiscount::class, 'origin_id');
    }
}
