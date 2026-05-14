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
        Schema::create('idempotency_keys', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('operation', 120);
            $table->string('idempotency_key', 160);
            $table->string('request_hash', 64);
            $table->json('response_json');
            $table->timestamps();

            $table->unique(['user_id', 'operation', 'idempotency_key'], 'idempotency_unique_per_user_operation');
            $table->index(['operation', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
