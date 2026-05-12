<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentEvent extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'payment_id',
        'event_type',
        'timestamp',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'payload' => 'array',
            'event_type' => \App\Enums\PaymentEventType::class,
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }
}
