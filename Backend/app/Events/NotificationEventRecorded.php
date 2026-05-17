<?php

namespace App\Events;

use BackedEnum;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationEventRecorded
{
    use Dispatchable, SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public BackedEnum $eventType,
        public array $payload,
    ) {
    }
}
