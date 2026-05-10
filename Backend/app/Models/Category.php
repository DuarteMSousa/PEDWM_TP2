<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasUuids;

    protected $fillable = [
        'chain_id',
        'name',
    ];

    public function chain(): BelongsTo
    {
        return $this->belongsTo(RestaurantChain::class, 'chain_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function promotionItems(): HasMany
    {
        return $this->hasMany(PromotionItem::class);
    }
}
