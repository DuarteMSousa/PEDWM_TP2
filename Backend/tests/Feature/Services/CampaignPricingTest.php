<?php

namespace Tests\Feature\Services;

use App\Models\Cart;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Restaurant;
use App\Models\RestaurantChain;
use App\Models\RestaurantProduct;
use App\Models\User;
use App\Services\OrderPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampaignPricingTest extends TestCase
{
    use RefreshDatabase;

    public function test_promotion_pricing_uses_promotion_discount_for_target_items(): void
    {
        [$cart, $restaurant, $category] = $this->cartWithSingleProduct(20.0);

        $promotion = Promotion::query()->create([
            'chain_id' => $restaurant->chain_id,
            'name' => 'Category Deal',
            'description' => null,
            'type' => 'PERCENTAGE',
            'target' => 'CATEGORY',
            'discount' => 10,
            'start_date' => now()->subDay(),
            'end_date' => now()->addDay(),
        ]);
        $promotion->promotionItems()->create(['item_id' => $category->id]);

        $pricing = app(OrderPricingService::class)->price($cart, $restaurant);

        $this->assertSame(2.0, $pricing['discount_total']);
    }

    public function test_coupon_pricing_uses_coupon_discount_for_target_items(): void
    {
        [$cart, $restaurant, , $product] = $this->cartWithSingleProduct(20.0);

        $coupon = Coupon::query()->create([
            'chain_id' => $restaurant->chain_id,
            'code' => 'PROD10',
            'description' => null,
            'type' => 'PERCENTAGE',
            'target' => 'PRODUCT',
            'discount' => 10,
            'expiry_date' => now()->addDay(),
        ]);
        $coupon->promotionItems()->create(['item_id' => $product->id]);

        $pricing = app(OrderPricingService::class)->price($cart, $restaurant, null, 'PROD10');

        $this->assertSame(2.0, $pricing['discount_total']);
    }

    private function cartWithSingleProduct(float $price): array
    {
        $user = User::query()->create([
            'name' => 'Cliente',
            'email' => uniqid('cliente_', true).'@example.com',
            'password' => 'password',
            'user_type' => 'CUSTOMER',
        ]);

        $chain = RestaurantChain::query()->create(['name' => uniqid('Chain ', true)]);
        $restaurant = Restaurant::query()->create([
            'chain_id' => $chain->id,
            'name' => 'Urban Grill',
            'opening_hours' => '09:00',
            'closing_hours' => '23:00',
            'delivery_radius' => 10,
        ]);
        $category = Category::query()->create([
            'chain_id' => $chain->id,
            'name' => 'Pizzas',
        ]);
        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Margherita',
            'price' => $price,
            'description' => null,
        ]);
        $restaurantProduct = RestaurantProduct::query()->create([
            'restaurant_id' => $restaurant->id,
            'product_id' => $product->id,
            'local_price' => $price,
            'is_available' => true,
            'estimated_preparation_time_min' => 10,
        ]);

        $cart = Cart::query()->create([
            'user_id' => $user->id,
            'total' => $price,
        ]);
        $cart->items()->create([
            'restaurant_product_id' => $restaurantProduct->id,
            'quantity' => 1,
            'unit_price' => $price,
            'total_price' => $price,
        ]);

        return [$cart->refresh(), $restaurant->refresh(), $category, $product];
    }
}
