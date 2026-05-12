<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use \App\Enums\CourierStatus;

class Courier extends Model
{
    use HasUuids;

    protected $primaryKey = 'user_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'status',
        'latitude',
        'longitude',
        'last_location_update',
        'rating_sum',
        'rating_count',
    ];

    protected function casts(): array
    {
        return [
            'last_location_update' => 'datetime',
            'rating_sum' => 'float',
            'rating_count' => 'integer',
            'latitude' => 'float',
            'longitude' => 'float',
            'status' => ::class,
        ];
    }

    public function uniqueIds(): array
    {
        return [];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class, 'courier_id', 'user_id');
    }
}
