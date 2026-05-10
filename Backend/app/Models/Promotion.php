<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Promotion extends Model
{
    use HasUuids;

    protected $fillable = [
        'chain_id',
        'name',
        'description',
        'type',
        'target',
        'start_date',
        'end_date',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'datetime',
            'end_date' => 'datetime',
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

    public function orderDiscounts(): HasMany
    {
        return $this->hasMany(OrderDiscount::class, 'origin_id');
    }
}
