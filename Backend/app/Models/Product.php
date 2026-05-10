<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasUuids;

    protected $fillable = [
        'category_id',
        'name',
        'price',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'float',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function restaurantProducts(): HasMany
    {
        return $this->hasMany(RestaurantProduct::class);
    }

    public function optionGroups(): HasMany
    {
        return $this->hasMany(ProductOptionGroup::class);
    }

    public function promotionItems(): HasMany
    {
        return $this->hasMany(PromotionItem::class);
    }
}
