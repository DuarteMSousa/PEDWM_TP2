<?php

namespace App\Enums;

enum DiscountOriginType: string
{
    case PROMOTION = 'PROMOTION';
    case COUPON = 'COUPON';
}
