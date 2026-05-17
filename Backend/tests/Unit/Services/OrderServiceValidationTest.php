<?php

namespace Tests\Unit\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Restaurant;
use App\Models\RestaurantAddress;
use App\Models\RestaurantProduct;
use App\Models\UserAddress;
use App\Services\OrderService\OrderService;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use ReflectionClass;
use Tests\TestCase;

class OrderServiceValidationTest extends TestCase
{
    public function test_checkout_cart_validation_accepts_available_product_inside_delivery_radius(): void
    {
        $service = new OrderService();
        $cart = $this->cartForRestaurant('restaurant-1', true, deliveryRadius: 5);
        $address = new UserAddress([
            'latitude' => 41.1500,
            'longitude' => -8.6110,
        ]);

        $this->invoke($service, 'validateCheckoutCart', $cart, 'restaurant-1', $address);

        $this->assertTrue(true);
    }

    public function test_checkout_cart_validation_rejects_unavailable_product(): void
    {
        $this->expectException(ValidationException::class);

        $cart = $this->cartForRestaurant('restaurant-1', false, deliveryRadius: 5);
        $address = new UserAddress(['latitude' => 41.1500, 'longitude' => -8.6110]);

        $this->invoke(new OrderService(), 'validateCheckoutCart', $cart, 'restaurant-1', $address);
    }

    public function test_checkout_cart_validation_rejects_different_restaurant(): void
    {
        $this->expectException(ValidationException::class);

        $cart = $this->cartForRestaurant('restaurant-2', true, deliveryRadius: 5);
        $address = new UserAddress(['latitude' => 41.1500, 'longitude' => -8.6110]);

        $this->invoke(new OrderService(), 'validateCheckoutCart', $cart, 'restaurant-1', $address);
    }

    public function test_checkout_cart_validation_rejects_address_outside_delivery_radius(): void
    {
        $this->expectException(ValidationException::class);

        $cart = $this->cartForRestaurant('restaurant-1', true, deliveryRadius: 1);
        $address = new UserAddress([
            'latitude' => 38.7223,
            'longitude' => -9.1393,
        ]);

        $this->invoke(new OrderService(), 'validateCheckoutCart', $cart, 'restaurant-1', $address);
    }

    private function cartForRestaurant(string $restaurantId, bool $isAvailable, float $deliveryRadius): Cart
    {
        $restaurantAddress = new RestaurantAddress([
            'latitude' => 41.1496,
            'longitude' => -8.6109,
        ]);

        $restaurant = new Restaurant([
            'id' => $restaurantId,
            'delivery_radius' => $deliveryRadius,
        ]);
        $restaurant->setRelation('address', $restaurantAddress);

        $restaurantProduct = new RestaurantProduct([
            'restaurant_id' => $restaurantId,
            'is_available' => $isAvailable,
        ]);
        $restaurantProduct->setRelation('restaurant', $restaurant);

        $cartItem = new CartItem();
        $cartItem->setRelation('restaurantProduct', $restaurantProduct);

        $cart = new Cart();
        $cart->setRelation('items', new Collection([$cartItem]));

        return $cart;
    }

    private function invoke(object $target, string $method, mixed ...$args): mixed
    {
        $reflection = new ReflectionClass($target);
        $reflectedMethod = $reflection->getMethod($method);


        return $reflectedMethod->invoke($target, ...$args);
    }
}
