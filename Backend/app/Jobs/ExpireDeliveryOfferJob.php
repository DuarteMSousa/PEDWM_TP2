<?php

namespace App\Jobs;

use App\Enums\DeliveryOfferStatus;
use App\Models\DeliveryOffer;
use App\Services\OutboxService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;

class ExpireDeliveryOfferJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $offerId)
    {
    }

    public function handle(): void
    {
        $offer = DeliveryOffer::query()->whereKey($this->offerId)->first();

        if (! $offer || $offer->status !== DeliveryOfferStatus::PENDING || $offer->expires_at->isFuture()) {
            return;
        }

        $offer->update(['status' => DeliveryOfferStatus::EXPIRED->value]);

        app(OutboxService::class)->enqueue('delivery_offer', $offer->id, 'JOB_EXPIRED', [
            'eventId' => (string) Str::uuid(),
            'eventName' => 'JOB_EXPIRED',
            'aggregateType' => 'delivery_offer',
            'aggregateId' => $offer->id,
            'offerId' => $offer->id,
            'deliveryId' => $offer->delivery_id,
            'courierId' => $offer->courier_id,
            'occurredAt' => now()->toIso8601String(),
            'channels' => ["courier.{$offer->courier_id}.jobs"],
        ]);

        AssignCourierToDeliveryJob::dispatch($offer->delivery_id);
    }
}
