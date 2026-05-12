<?php

namespace App\Enums;

enum CourierStatus: string
{
    case AVAILABLE = 'AVAILABLE';
    case BUSY = 'BUSY';
    case OFFLINE = 'OFFLINE';
}
