<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case CASH = 'CASH';
    case CARD = 'CARD';
    case MBWAY = 'MBWAY';
    case PAYPAL = 'PAYPAL';
}
