<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use \App\Enums\DeliveryStatus;
class Delivery extends Model
{
    use HasUuids;

    protected $fillable = [
        'order_id',
        'courier_id',
        'status',
        'pickup_time',
        'delivery_time',
        'delivery_fee',
    ];

    protected function casts(): array
    {
        return [
            'pickup_time' => 'datetime',
            'delivery_time' => 'datetime',
            'delivery_fee' => 'float',
            'status' => DeliveryStatus::class,
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function courier(): BelongsTo
    {
        return $this->belongsTo(Courier::class, 'courier_id', 'user_id');
    }

    public function positionHistory(): HasMany
    {
        return $this->hasMany(CourierPositionHistory::class);
    }
}
