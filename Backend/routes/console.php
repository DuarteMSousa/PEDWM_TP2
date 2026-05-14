<?php

use App\Jobs\PublishOutboxEventJob;
use App\Models\OutboxEvent;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('outbox:process {--limit=100}', function (): void {
    $limit = max(1, (int) $this->option('limit'));

    $events = OutboxEvent::query()
        ->where('status', 'PENDING')
        ->where(function ($query): void {
            $query->whereNull('next_attempt_at')
                ->orWhere('next_attempt_at', '<=', now());
        })
        ->orderBy('created_at')
        ->limit($limit)
        ->get();

    foreach ($events as $event) {
        PublishOutboxEventJob::dispatch($event->id);
    }

    $this->info("Queued {$events->count()} outbox event(s) for publishing.");
})->purpose('Dispatch pending outbox events for publishing.');
