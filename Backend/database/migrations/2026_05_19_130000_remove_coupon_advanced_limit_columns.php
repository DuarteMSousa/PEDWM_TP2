<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table): void {
            foreach (['min_order_total', 'max_discount_amount', 'max_uses', 'used_count'] as $column) {
                if (Schema::hasColumn('coupons', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    public function down(): void
    {
        // No-op: these columns are no longer part of the Coupon model.
    }
};
