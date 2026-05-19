<?php

namespace App\Jobs;

use App\Services\DeliveryService\DeliveryServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ExpireDeliveryOfferJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $offerId)
    {
    }

    public function handle(): void
    {
        app(DeliveryServiceInterface::class)->expireOfferByJob($this->offerId);
    }
}
