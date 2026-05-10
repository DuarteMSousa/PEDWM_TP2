<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'chat_id',
        'sender_participant_id',
        'content',
        'timestamp',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class);
    }

    public function senderParticipant(): BelongsTo
    {
        return $this->belongsTo(ChatParticipant::class, 'sender_participant_id');
    }
}
