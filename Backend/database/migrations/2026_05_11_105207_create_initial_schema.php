<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // users

        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('user_type', ['CUSTOMER', 'COURIER', 'CHAIN_MANAGER', 'LOCAL_MANAGER']);
            $table->timestamps();
        });

        Schema::create('couriers', function (Blueprint $table) {
            $table->foreignUuid('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['AVAILABLE', 'BUSY', 'OFFLINE'])->default('OFFLINE');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamp('last_location_update')->nullable();
            $table->float('rating_sum')->default(0);
            $table->integer('rating_count')->default(0);
            $table->timestamps();
        });

        // restaurants

        Schema::create('restaurant_chains', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('restaurants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('chain_id')->constrained('restaurant_chains')->cascadeOnDelete();
            $table->string('name');
            $table->string('opening_hours');
            $table->string('closing_hours');
            $table->float('delivery_radius');
            $table->float('rating_sum')->default(0);
            $table->integer('rating_count')->default(0);
            $table->timestamps();
        });

        Schema::create('chain_managers', function (Blueprint $table) {
            $table->foreignUuid('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('chain_id')->nullable()->constrained('restaurant_chains')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('local_managers', function (Blueprint $table) {
            $table->foreignUuid('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('restaurant_id')->nullable()->constrained('restaurants')->nullOnDelete();
            $table->timestamps();
        });

        // menu

        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('chain_id')->constrained('restaurant_chains')->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->constrained('categories')->cascadeOnDelete();
            $table->string('name');
            $table->float('price');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('restaurant_products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('restaurant_id')->constrained('restaurants')->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->float('local_price')->nullable();
            $table->boolean('is_available')->default(true);
            $table->integer('estimated_preparation_time_min')->nullable();
            $table->timestamps();
        });

        Schema::create('product_option_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('name');
            $table->integer('max_options');
            $table->integer('min_options');
            $table->timestamps();
        });

        Schema::create('product_options', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('option_group_id')->constrained('product_option_groups')->cascadeOnDelete();
            $table->string('name');
            $table->float('extra_price')->default(0);
            $table->boolean('default_option')->default(false);
            $table->timestamps();
        });

        // cart

        Schema::create('carts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->float('total')->default(0);
            $table->timestamps();
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cart_id')->constrained('carts')->cascadeOnDelete();
            $table->foreignUuid('restaurant_product_id')->constrained('restaurant_products')->cascadeOnDelete();
            $table->integer('quantity');
            $table->float('unit_price');
            $table->float('total_price');
            $table->timestamps();
        });

        Schema::create('cart_item_options', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cart_item_id')->constrained('cart_items')->cascadeOnDelete();
            $table->foreignUuid('product_option_id')->constrained('product_options')->cascadeOnDelete();
            $table->float('extra_price')->default(0);
            $table->timestamps();
        });

        // orders

        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('restaurant_id')->constrained('restaurants')->cascadeOnDelete();
            $table->enum('status', ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']);
            $table->float('total');
            $table->string('restaurant_name_snapshot');
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('restaurant_product_id')->constrained('restaurant_products')->cascadeOnDelete();
            $table->enum('status', ['PENDING', 'PREPARING', 'READY', 'CANCELLED']);
            $table->integer('quantity');
            $table->float('unit_price');
            $table->string('product_name_snapshot');
            $table->float('total_price');
            $table->timestamps();
        });

        Schema::create('order_item_options', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->foreignUuid('product_option_id')->constrained('product_options')->cascadeOnDelete();
            $table->string('option_name_snapshot');
            $table->float('extra_price')->default(0);
            $table->timestamps();
        });

        // payment

        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->enum('method', ['CASH', 'CARD', 'MBWAY', 'PAYPAL']);
            $table->enum('status', ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']);
            $table->string('transaction_id')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->float('amount');
            $table->timestamps();
        });

        // delivery

        Schema::create('deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('courier_id')->nullable()->constrained('couriers', 'user_id')->nullOnDelete();
            $table->enum('status', ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED']);
            $table->timestamp('pickup_time')->nullable();
            $table->timestamp('delivery_time')->nullable();
            $table->float('delivery_fee');
            $table->timestamps();
        });

        Schema::create('courier_position_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('delivery_id')->constrained('deliveries')->cascadeOnDelete();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->timestamp('timestamp');
        });

        // promotions

        Schema::create('coupons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('chain_id')->constrained('restaurant_chains')->cascadeOnDelete();
            $table->string('code')->unique();
            $table->string('description')->nullable();
            $table->enum('type', ['PERCENTAGE', 'FIXED_AMOUNT']);
            $table->enum('target', ['ORDER', 'PRODUCT', 'DELIVERY', 'CATEGORY']);
            $table->timestamp('expiry_date')->nullable();
            $table->timestamps();
        });

        Schema::create('promotions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('chain_id')->constrained('restaurant_chains')->cascadeOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->enum('type', ['PERCENTAGE', 'FIXED_AMOUNT']);
            $table->enum('target', ['ORDER', 'PRODUCT', 'DELIVERY', 'CATEGORY']);
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();
            $table->timestamps();
        });

        Schema::create('promotion_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('promotion_id')->nullable()->constrained('promotions')->cascadeOnDelete();
            $table->foreignUuid('product_id')->nullable()->constrained('products')->cascadeOnDelete();
            $table->foreignUuid('category_id')->nullable()->constrained('categories')->cascadeOnDelete();
            $table->float('discount');
            $table->timestamps();
        });

        // reviews

        Schema::create('reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('rating');
            $table->text('comment')->nullable();
            $table->enum('target_type', ['RESTAURANT', 'COURIER']);
            $table->uuid('target_id');
            $table->timestamps();
        });

        // chat

        Schema::create('chats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->enum('type', ['CUSTOMER_RESTAURANT', 'CUSTOMER_COURIER']);
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('chat_participants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('chat_id')->constrained('chats')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('user_type', ['CUSTOMER', 'COURIER', 'CHAIN_MANAGER', 'LOCAL_MANAGER']);
            $table->timestamp('joined_at')->nullable();
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('chat_id')->constrained('chats')->cascadeOnDelete();
            $table->foreignUuid('sender_participant_id')->constrained('chat_participants')->cascadeOnDelete();
            $table->text('content');
            $table->timestamp('timestamp');
            $table->timestamp('read_at')->nullable();
        });

        // addresses

        Schema::create('user_addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('street');
            $table->string('city');
            $table->string('postal_code');
            $table->string('country');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->boolean('is_default')->default(false);
            $table->string('label')->nullable();
            $table->timestamps();
        });

        Schema::create('restaurant_addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('restaurant_id')->constrained('restaurants')->cascadeOnDelete();
            $table->string('street');
            $table->string('city');
            $table->string('postal_code');
            $table->string('country');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->timestamps();
        });

        Schema::create('order_addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('street');
            $table->string('city');
            $table->string('postal_code');
            $table->string('country');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->timestamps();
        });

        // events

        Schema::create('order_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->enum('event_type', ['ORDER_CREATED', 'ORDER_PAYMENT_COMPLETED', 'ORDER_CONFIRMED', 'ORDER_REJECTED', 'ORDER_PREPARING', 'ORDER_READY', 'ORDER_COURIER_ASSIGNED', 'ORDER_PICKED_UP', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED']);
            $table->timestamp('timestamp');
            $table->jsonb('payload')->nullable();
        });

        Schema::create('payment_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->enum('event_type', ['PAYMENT_CREATED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'PAYMENT_CANCELLED']);
            $table->timestamp('timestamp');
            $table->jsonb('payload')->nullable();
        });

        // order discounts

        Schema::create('order_discounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('name_snapshot');
            $table->string('description_snapshot')->nullable();
            $table->float('discount_amount');
            $table->enum('discount_type', ['PERCENTAGE', 'FIXED_AMOUNT']);
            $table->enum('discount_target', ['ORDER', 'PRODUCT', 'DELIVERY', 'CATEGORY']);
            $table->foreignUuid('order_item_id')->nullable()->constrained('order_items')->cascadeOnDelete();
            $table->enum('origin_type', ['PROMOTION', 'COUPON']);
            $table->uuid('origin_id');
            $table->timestamps();
        });

        // notifications

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['ORDER_UPDATE', 'PROMOTION', 'SYSTEM']);
            $table->string('title');
            $table->text('message');
            $table->timestamp('sent_at');
            $table->timestamp('read_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('order_discounts');
        Schema::dropIfExists('payment_events');
        Schema::dropIfExists('order_events');
        Schema::dropIfExists('order_addresses');
        Schema::dropIfExists('restaurant_addresses');
        Schema::dropIfExists('user_addresses');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('chat_participants');
        Schema::dropIfExists('chats');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('promotion_items');
        Schema::dropIfExists('promotions');
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('courier_position_history');
        Schema::dropIfExists('deliveries');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_item_options');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('cart_item_options');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('product_options');
        Schema::dropIfExists('product_option_groups');
        Schema::dropIfExists('restaurant_products');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('local_managers');
        Schema::dropIfExists('chain_managers');
        Schema::dropIfExists('restaurants');
        Schema::dropIfExists('restaurant_chains');
        Schema::dropIfExists('couriers');
        Schema::dropIfExists('users');
    }
};
