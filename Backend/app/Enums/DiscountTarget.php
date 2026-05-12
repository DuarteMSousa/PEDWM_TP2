<?php

namespace App\Enums;

enum DiscountTarget: string
{
    case ORDER = 'ORDER';
    case PRODUCT = 'PRODUCT';
    case DELIVERY = 'DELIVERY';
    case CATEGORY = 'CATEGORY';
}
