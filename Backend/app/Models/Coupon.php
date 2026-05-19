<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Coupon extends Model
{
    use HasUuids;

    protected $fillable = [
        'chain_id',
        'code',
        'description',
        'type',
        'target',
        'discount',
        'expiry_date',
    ];

    protected function casts(): array
    {
        return [
            'expiry_date' => 'datetime',
            'discount' => 'float',
        ];
    }

    public function chain(): BelongsTo
    {
        return $this->belongsTo(RestaurantChain::class, 'chain_id');
    }

    public function promotionItems(): MorphMany
    {
        return $this->morphMany(PromotionItem::class, 'parent');
    }

    public function orderDiscounts(): HasMany
    {
        return $this->hasMany(OrderDiscount::class, 'origin_id');
    }
}
