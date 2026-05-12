<?php

namespace App\Enums;

enum NotificationType: string
{
    case ORDER_UPDATE = 'ORDER_UPDATE';
    case PROMOTION = 'PROMOTION';
    case SYSTEM = 'SYSTEM';
}
