<?php

namespace App\Enums;

enum OutboxStatus: string
{
    case PENDING = 'PENDING';
    case PROCESSING = 'PROCESSING';
    case PUBLISHED = 'PUBLISHED';
    case FAILED = 'FAILED';
}
