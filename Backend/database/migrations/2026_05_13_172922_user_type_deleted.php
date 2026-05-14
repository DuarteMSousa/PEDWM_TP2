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
                $table->enum('user_type', ['customer', 'courier', 'chain_manager', 'local_manager'])
                    ->default('customer');
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
