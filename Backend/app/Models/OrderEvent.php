<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderEvent extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'event_type',
        'timestamp',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'payload' => 'array',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
