<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Promotion extends Model
{
    use HasUuids;

    protected $fillable = [
        'chain_id',
        'name',
        'description',
        'type',
        'target',
        'discount',
        'start_date',
        'end_date',
    ];

    protected function casts(): array
    {
        return [
            'discount' => 'float',
            'start_date' => 'datetime',
            'end_date' => 'datetime',
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

    public function orderDiscounts(): MorphMany
    {
        return $this->morphMany(OrderDiscount::class, 'origin');
    }
}
