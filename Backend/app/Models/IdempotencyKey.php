<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IdempotencyKey extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'operation',
        'idempotency_key',
        'request_hash',
        'response_json',
    ];

    protected function casts(): array
    {
        return [
            'response_json' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
