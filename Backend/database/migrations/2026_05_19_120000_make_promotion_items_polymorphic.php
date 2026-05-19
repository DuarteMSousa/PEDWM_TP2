<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table): void {
            if (! Schema::hasColumn('promotions', 'discount')) {
                $table->float('discount')->default(0)->after('target');
            }
        });

        Schema::table('coupons', function (Blueprint $table): void {
            if (Schema::hasColumn('coupons', 'product_id')) {
                $table->dropConstrainedForeignId('product_id');
            }

            if (Schema::hasColumn('coupons', 'category_id')) {
                $table->dropConstrainedForeignId('category_id');
            }
        });

        $shouldAddIndexes = ! Schema::hasColumn('promotion_items', 'parent_type');

        Schema::table('promotion_items', function (Blueprint $table): void {
            if (! Schema::hasColumn('promotion_items', 'parent_type')) {
                $table->enum('parent_type', ['PROMOTION', 'COUPON'])->nullable()->after('id');
            }

            if (! Schema::hasColumn('promotion_items', 'parent_id')) {
                $table->uuid('parent_id')->nullable()->after('parent_type');
            }

            if (! Schema::hasColumn('promotion_items', 'item_id')) {
                $table->uuid('item_id')->nullable()->after('parent_id');
            }
        });

        if (Schema::hasColumn('promotion_items', 'promotion_id')) {
            DB::table('promotion_items')
                ->whereNull('parent_type')
                ->update([
                    'parent_type' => 'PROMOTION',
                    'parent_id' => DB::raw('promotion_id'),
                ]);
        }

        if (Schema::hasColumn('promotion_items', 'product_id')) {
            DB::table('promotion_items')
                ->whereNull('item_id')
                ->whereNotNull('product_id')
                ->update(['item_id' => DB::raw('product_id')]);
        }

        if (Schema::hasColumn('promotion_items', 'category_id')) {
            DB::table('promotion_items')
                ->whereNull('item_id')
                ->whereNotNull('category_id')
                ->update(['item_id' => DB::raw('category_id')]);
        }

        Schema::table('promotion_items', function (Blueprint $table): void {
            if (Schema::hasColumn('promotion_items', 'promotion_id')) {
                $table->dropConstrainedForeignId('promotion_id');
            }

            if (Schema::hasColumn('promotion_items', 'product_id')) {
                $table->dropConstrainedForeignId('product_id');
            }

            if (Schema::hasColumn('promotion_items', 'category_id')) {
                $table->dropConstrainedForeignId('category_id');
            }

            if (Schema::hasColumn('promotion_items', 'discount')) {
                $table->dropColumn('discount');
            }
        });

        if ($shouldAddIndexes) {
            Schema::table('promotion_items', function (Blueprint $table): void {
                $table->index(['parent_type', 'parent_id']);
                $table->index('item_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('promotion_items', function (Blueprint $table): void {
            if (Schema::hasColumn('promotion_items', 'item_id')) {
                $table->dropColumn('item_id');
            }

            if (Schema::hasColumn('promotion_items', 'parent_id')) {
                $table->dropColumn('parent_id');
            }

            if (Schema::hasColumn('promotion_items', 'parent_type')) {
                $table->dropColumn('parent_type');
            }

            if (! Schema::hasColumn('promotion_items', 'discount')) {
                $table->float('discount')->default(0);
            }
        });

        Schema::table('promotions', function (Blueprint $table): void {
            if (Schema::hasColumn('promotions', 'discount')) {
                $table->dropColumn('discount');
            }
        });
    }
};
