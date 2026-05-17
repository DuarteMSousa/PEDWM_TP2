<?php

namespace App\Enums;

enum DeliveryOfferEventType: string
{
    case JOB_OFFERED = 'JOB_OFFERED';
    case JOB_ACCEPTED = 'JOB_ACCEPTED';
    case JOB_REJECTED = 'JOB_REJECTED';
    case JOB_EXPIRED = 'JOB_EXPIRED';
}
