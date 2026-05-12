<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'rating',
        'comment',
        'target_type',
        'target_id',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'target_type' => \App\Enums\ReviewTargetType::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
