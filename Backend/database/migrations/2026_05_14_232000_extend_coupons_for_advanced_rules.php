<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Coupon advanced limit columns were removed from the domain.
    }

    public function down(): void
    {
        // No-op: the removed columns are intentionally not restored.
    }
};
