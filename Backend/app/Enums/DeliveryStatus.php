<?php

namespace App\Enums;

enum DeliveryStatus: string
{
    case PENDING = 'PENDING';
    case PICKED_UP = 'PICKED_UP';
    case IN_TRANSIT = 'IN_TRANSIT';
    case DELIVERED = 'DELIVERED';
    case FAILED = 'FAILED';
}
