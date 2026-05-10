<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Restaurant extends Model
{
    use HasUuids;

    protected $fillable = [
        'chain_id',
        'name',
        'opening_hours',
        'closing_hours',
        'delivery_radius',
        'rating_sum',
        'rating_count',
    ];

    protected function casts(): array
    {
        return [
            'delivery_radius' => 'float',
            'rating_sum' => 'float',
            'rating_count' => 'integer',
        ];
    }

    public function chain(): BelongsTo
    {
        return $this->belongsTo(RestaurantChain::class, 'chain_id');
    }

    public function localManager(): HasOne
    {
        return $this->hasOne(LocalManager::class, 'restaurant_id');
    }

    public function restaurantProducts(): HasMany
    {
        return $this->hasMany(RestaurantProduct::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function address(): HasOne
    {
        return $this->hasOne(RestaurantAddress::class);
    }
}
