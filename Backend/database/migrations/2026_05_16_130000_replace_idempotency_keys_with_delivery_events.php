<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('idempotency_keys');

        Schema::create('delivery_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('delivery_id')->constrained('deliveries')->cascadeOnDelete();
            $table->enum('event_type', [
                'DELIVERY_ACCEPTED',
                'DELIVERY_PICKED_UP',
                'DELIVERY_IN_TRANSIT',
                'DELIVERY_DELIVERED',
                'DELIVERY_FAILED',
            ]);
            $table->jsonb('payload')->nullable();
            $table->timestamp('created_at');

            $table->index(['delivery_id', 'created_at']);
            $table->index(['event_type', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_events');
    }
};
