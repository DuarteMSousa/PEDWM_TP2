<?php

namespace App\Enums;

enum UserType: string
{
    case CUSTOMER = 'CUSTOMER';
    case COURIER = 'COURIER';
    case CHAIN_MANAGER = 'CHAIN_MANAGER';
    case LOCAL_MANAGER = 'LOCAL_MANAGER';
}
