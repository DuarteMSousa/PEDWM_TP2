<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table): void {
            if (! Schema::hasColumn('coupons', 'product_id')) {
                $table->foreignUuid('product_id')->nullable()->after('target')->constrained('products')->nullOnDelete();
            }

            if (! Schema::hasColumn('coupons', 'category_id')) {
                $table->foreignUuid('category_id')->nullable()->after('product_id')->constrained('categories')->nullOnDelete();
            }

            if (! Schema::hasColumn('coupons', 'min_order_total')) {
                $table->float('min_order_total')->nullable()->after('discount');
            }

            if (! Schema::hasColumn('coupons', 'max_discount_amount')) {
                $table->float('max_discount_amount')->nullable()->after('min_order_total');
            }

            if (! Schema::hasColumn('coupons', 'max_uses')) {
                $table->unsignedInteger('max_uses')->nullable()->after('max_discount_amount');
            }

            if (! Schema::hasColumn('coupons', 'used_count')) {
                $table->unsignedInteger('used_count')->default(0)->after('max_uses');
            }
        });
    }

    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table): void {
            if (Schema::hasColumn('coupons', 'product_id')) {
                $table->dropConstrainedForeignId('product_id');
            }

            if (Schema::hasColumn('coupons', 'category_id')) {
                $table->dropConstrainedForeignId('category_id');
            }

            foreach (['min_order_total', 'max_discount_amount', 'max_uses', 'used_count'] as $column) {
                if (Schema::hasColumn('coupons', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
