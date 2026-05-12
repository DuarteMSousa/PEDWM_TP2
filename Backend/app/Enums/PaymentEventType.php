<?php

namespace App\Enums;

enum PaymentEventType: string
{
    case PAYMENT_CREATED = 'PAYMENT_CREATED';
    case PAYMENT_COMPLETED = 'PAYMENT_COMPLETED';
    case PAYMENT_FAILED = 'PAYMENT_FAILED';
    case PAYMENT_EXPIRED = 'PAYMENT_EXPIRED';
}
