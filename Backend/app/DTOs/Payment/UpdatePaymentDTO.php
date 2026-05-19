<?php

namespace App\DTOs\Payment;

use App\Enums\PaymentStatus;
use Carbon\CarbonInterface;

final readonly class UpdatePaymentDTO
{
    public function __construct(
        public ?PaymentStatus $status = null,
        public ?string $transactionId = null,
        public ?CarbonInterface $paidAt = null,
    ) {
    }
}
