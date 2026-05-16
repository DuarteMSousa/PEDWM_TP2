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
        if (! Schema::hasColumn('users', 'user_type')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->enum('user_type', ['CUSTOMER', 'COURIER', 'CHAIN_MANAGER', 'LOCAL_MANAGER'])
                    ->default('CUSTOMER');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // no-op: this migration now acts as a guard to keep role data available
        // for authorization, channels and enum casting.
    }
};
