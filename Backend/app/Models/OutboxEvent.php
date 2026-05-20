<?php

namespace App\Models;

use App\Enums\OutboxStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class OutboxEvent extends Model
{
    use HasUuids;

    protected $fillable = [
        'aggregate_type',
        'aggregate_id',
        'event_name',
        'payload',
        'status',
        'retry_count',
        'next_attempt_at',
        'published_at',
        'last_error',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'retry_count' => 'integer',
            'next_attempt_at' => 'datetime',
            'published_at' => 'datetime',
            'status' => OutboxStatus::class,
        ];
    }
}
