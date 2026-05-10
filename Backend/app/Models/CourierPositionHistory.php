<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourierPositionHistory extends Model
{
    use HasUuids;

    public $timestamps = false;
    protected $table = 'courier_position_history';

    protected $fillable = [
        'delivery_id',
        'latitude',
        'longitude',
        'timestamp',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'timestamp' => 'datetime',
        ];
    }

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class);
    }
}
