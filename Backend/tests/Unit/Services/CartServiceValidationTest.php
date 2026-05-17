<?php

namespace Tests\Unit\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\ProductOptionGroup;
use App\Models\RestaurantProduct;
use App\Services\CartService\CartService;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use ReflectionClass;
use Tests\TestCase;

class CartServiceValidationTest extends TestCase
{
    public function test_rejects_unavailable_restaurant_product(): void
    {
        $this->expectException(ValidationException::class);

        $cart = new Cart();
        $cart->setRelation('items', new Collection());
        $restaurantProduct = new RestaurantProduct([
            'restaurant_id' => 'restaurant-1',
            'is_available' => false,
        ]);

        $this->invoke(new CartService(), 'validateRestaurantProductCanBeAdded', $cart, $restaurantProduct);
    }

    public function test_rejects_products_from_different_restaurants(): void
    {
        $this->expectException(ValidationException::class);

        $existingRestaurantProduct = new RestaurantProduct(['restaurant_id' => 'restaurant-1']);
        $cartItem = new CartItem();
        $cartItem->setRelation('restaurantProduct', $existingRestaurantProduct);

        $cart = new Cart();
        $cart->setRelation('items', new Collection([$cartItem]));

        $newRestaurantProduct = new RestaurantProduct([
            'restaurant_id' => 'restaurant-2',
            'is_available' => true,
        ]);

        $this->invoke(new CartService(), 'validateRestaurantProductCanBeAdded', $cart, $newRestaurantProduct);
    }

    public function test_accepts_options_that_belong_to_product_and_respect_group_limits(): void
    {
        $service = new CartService();
        $restaurantProduct = $this->restaurantProductWithOptions(minOptions: 1, maxOptions: 2);
        $option = $restaurantProduct->product->optionGroups->first()->options->first();

        $this->invoke($service, 'validateOptionsForProduct', $restaurantProduct, [$option->id], new Collection([$option]));

        $this->assertTrue(true);
    }

    public function test_rejects_options_that_do_not_belong_to_product(): void
    {
        $this->expectException(ValidationException::class);

        $service = new CartService();
        $restaurantProduct = $this->restaurantProductWithOptions(minOptions: 0, maxOptions: 1);
        $option = new ProductOption([
            'option_group_id' => 'group-other',
            'extra_price' => 0,
        ]);
        $option->id = 'option-other';

        $this->invoke($service, 'validateOptionsForProduct', $restaurantProduct, [$option->id], new Collection([$option]));
    }

    public function test_rejects_option_selection_below_minimum(): void
    {
        $this->expectException(ValidationException::class);

        $restaurantProduct = $this->restaurantProductWithOptions(minOptions: 1, maxOptions: 2);

        $this->invoke(new CartService(), 'validateOptionsForProduct', $restaurantProduct, [], new Collection());
    }

    private function restaurantProductWithOptions(int $minOptions, int $maxOptions): RestaurantProduct
    {
        $option = new ProductOption([
            'option_group_id' => 'group-1',
            'extra_price' => 1.5,
        ]);
        $option->id = 'option-1';
        $group = new ProductOptionGroup([
            'name' => 'Extras',
            'min_options' => $minOptions,
            'max_options' => $maxOptions,
        ]);
        $group->id = 'group-1';
        $group->setRelation('options', new Collection([$option]));

        $product = new Product();
        $product->id = 'product-1';
        $product->setRelation('optionGroups', new Collection([$group]));

        $restaurantProduct = new RestaurantProduct();
        $restaurantProduct->id = 'rp-1';
        $restaurantProduct->setRelation('product', $product);

        return $restaurantProduct;
    }

    private function invoke(object $target, string $method, mixed ...$args): mixed
    {
        $reflection = new ReflectionClass($target);
        $reflectedMethod = $reflection->getMethod($method);


        return $reflectedMethod->invoke($target, ...$args);
    }
}
