<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $maps = [
            'orders' => [
                'pending' => 'PENDING',
                'confirmed' => 'CONFIRMED',
                'preparing' => 'PREPARING',
                'ready' => 'READY',
                'out_for_delivery' => 'OUT_FOR_DELIVERY',
                'delivered' => 'DELIVERED',
                'cancelled' => 'CANCELLED',
            ],
            'order_items' => [
                'pending' => 'PENDING',
                'preparing' => 'PREPARING',
                'ready' => 'READY',
                'cancelled' => 'CANCELLED',
            ],
            'deliveries' => [
                'pending' => 'PENDING',
                'picked_up' => 'PICKED_UP',
                'in_transit' => 'IN_TRANSIT',
                'delivered' => 'DELIVERED',
                'failed' => 'FAILED',
            ],
            'delivery_offers' => [
                'pending' => 'PENDING',
                'accepted' => 'ACCEPTED',
                'rejected' => 'REJECTED',
                'expired' => 'EXPIRED',
            ],
            'payments' => [
                'pending' => 'PENDING',
                'completed' => 'COMPLETED',
                'failed' => 'FAILED',
                'cancelled' => 'CANCELLED',
            ],
        ];

        foreach ($maps as $table => $statusMap) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            foreach ($statusMap as $legacy => $normalized) {
                DB::table($table)
                    ->where('status', $legacy)
                    ->update(['status' => $normalized]);
            }
        }
    }

    public function down(): void
    {
        // Data normalization is intentionally one-way.
    }
};
