<?php

namespace App\DTOs\Payment;

use App\Enums\PaymentEventType;
use Carbon\CarbonInterface;

final readonly class CreatePaymentEventDTO
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public PaymentEventType $eventType,
        public CarbonInterface $timestamp,
        public array $payload,
    ) {
    }
}
