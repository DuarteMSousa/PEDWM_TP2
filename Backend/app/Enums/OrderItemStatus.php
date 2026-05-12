<?php

namespace App\Enums;

enum OrderItemStatus: string
{
    case PENDING = 'PENDING';
    case PREPARING = 'PREPARING';
    case READY = 'READY';
    case CANCELLED = 'CANCELLED';
}
