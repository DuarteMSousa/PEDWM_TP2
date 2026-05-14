<?php

namespace App\Enums;

enum UserType: string
{
    case CUSTOMER = 'customer';
    case COURIER = 'courier';
    case CHAIN_MANAGER = 'chain_manager';
    case LOCAL_MANAGER = 'local_manager';
}
