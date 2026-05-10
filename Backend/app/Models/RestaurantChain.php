<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RestaurantChain extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
    ];

    public function restaurants(): HasMany
    {
        return $this->hasMany(Restaurant::class, 'chain_id');
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class, 'chain_id');
    }

    public function chainManagers(): HasMany
    {
        return $this->hasMany(ChainManager::class, 'chain_id');
    }

    public function promotions(): HasMany
    {
        return $this->hasMany(Promotion::class, 'chain_id');
    }

    public function coupons(): HasMany
    {
        return $this->hasMany(Coupon::class, 'chain_id');
    }
}
