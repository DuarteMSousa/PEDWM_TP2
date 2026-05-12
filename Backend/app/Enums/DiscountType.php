<?php

namespace App\Enums;

enum DiscountType: string
{
    case PERCENTAGE = 'PERCENTAGE';
    case FIXED_AMOUNT = 'FIXED_AMOUNT';
}
