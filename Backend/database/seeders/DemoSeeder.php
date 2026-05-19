<?php

namespace Database\Seeders;

use App\Enums\CourierStatus;
use App\Enums\UserType;
use App\Models\ChainManager;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Courier;
use App\Models\LocalManager;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\ProductOptionGroup;
use App\Models\Promotion;
use App\Models\Restaurant;
use App\Models\RestaurantAddress;
use App\Models\RestaurantChain;
use App\Models\RestaurantProduct;
use App\Models\User;
use App\Models\UserAddress;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * DemoSeeder
 *
 * Popula a base de dados com um cenario completo para a defesa:
 * - 1 cadeia "FastBite" com 2 restaurantes (Porto Centro e Vila Nova de Gaia)
 * - 1 chain manager + 1 local manager
 * - 2 clientes com moradas
 * - 2 estafetas (1 AVAILABLE, 1 OFFLINE) com posicoes proximas
 * - 3 categorias (Hamburgueres, Pizzas, Bebidas) com 6 produtos
 * - Option groups para hamburgueres e pizzas
 * - 1 cupao BEMVINDO -10% no total da encomenda
 * - 1 promocao "Pizza Festa" -15% em todas as pizzas
 *
 * Credenciais: password "password" para todos os utilizadores.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $this->wipe();

            // ----------------------------------------------------------------
            // Utilizadores
            // ----------------------------------------------------------------
            $chainManagerUser = User::create([
                'name' => 'Manuel Cadeia',
                'email' => 'chain@fastbite.pt',
                'password' => 'password',
                'user_type' => UserType::CHAIN_MANAGER,
            ]);

            $localManagerUser = User::create([
                'name' => 'Joana Loja',
                'email' => 'local@fastbite.pt',
                'password' => 'password',
                'user_type' => UserType::LOCAL_MANAGER,
            ]);

            $customerOneUser = User::create([
                'name' => 'Alexandre Cliente',
                'email' => 'cliente@fastbite.pt',
                'password' => 'password',
                'user_type' => UserType::CUSTOMER,
            ]);

            $customerTwoUser = User::create([
                'name' => 'Beatriz Cliente',
                'email' => 'cliente2@fastbite.pt',
                'password' => 'password',
                'user_type' => UserType::CUSTOMER,
            ]);

            $courierOneUser = User::create([
                'name' => 'Carlos Estafeta',
                'email' => 'estafeta@fastbite.pt',
                'password' => 'password',
                'user_type' => UserType::COURIER,
            ]);

            $courierTwoUser = User::create([
                'name' => 'Diana Estafeta',
                'email' => 'estafeta2@fastbite.pt',
                'password' => 'password',
                'user_type' => UserType::COURIER,
            ]);

            // Courier rows (estafeta1 online perto do restaurante)
            Courier::create([
                'user_id' => $courierOneUser->id,
                'status' => CourierStatus::AVAILABLE,
                'latitude' => 41.1496,
                'longitude' => -8.6109,
                'last_location_update' => now(),
            ]);

            Courier::create([
                'user_id' => $courierTwoUser->id,
                'status' => CourierStatus::OFFLINE,
                'latitude' => 41.1339,
                'longitude' => -8.6113,
                'last_location_update' => now()->subHours(2),
            ]);

            // ----------------------------------------------------------------
            // Cadeia + restaurantes
            // ----------------------------------------------------------------
            $chain = RestaurantChain::create([
                'name' => 'FastBite',
            ]);

            $restaurantCentro = Restaurant::create([
                'chain_id' => $chain->id,
                'name' => 'FastBite Porto Centro',
                'opening_hours' => '10:00',
                'closing_hours' => '23:00',
                'delivery_radius' => 6.0,
            ]);

            $restaurantVNG = Restaurant::create([
                'chain_id' => $chain->id,
                'name' => 'FastBite Vila Nova de Gaia',
                'opening_hours' => '11:00',
                'closing_hours' => '22:30',
                'delivery_radius' => 5.0,
            ]);

            RestaurantAddress::create([
                'restaurant_id' => $restaurantCentro->id,
                'street' => 'Rua de Santa Catarina 100',
                'city' => 'Porto',
                'postal_code' => '4000-447',
                'country' => 'Portugal',
                'latitude' => 41.1496,
                'longitude' => -8.6109,
            ]);

            RestaurantAddress::create([
                'restaurant_id' => $restaurantVNG->id,
                'street' => 'Avenida da Republica 50',
                'city' => 'Vila Nova de Gaia',
                'postal_code' => '4400-203',
                'country' => 'Portugal',
                'latitude' => 41.1339,
                'longitude' => -8.6113,
            ]);

            // Vinculo dos managers
            ChainManager::create([
                'user_id' => $chainManagerUser->id,
                'chain_id' => $chain->id,
            ]);

            LocalManager::create([
                'user_id' => $localManagerUser->id,
                'restaurant_id' => $restaurantCentro->id,
            ]);

            // ----------------------------------------------------------------
            // Moradas dos clientes
            // ----------------------------------------------------------------
            UserAddress::create([
                'user_id' => $customerOneUser->id,
                'street' => 'Avenida da Boavista 1500',
                'city' => 'Porto',
                'postal_code' => '4100-114',
                'country' => 'Portugal',
                'latitude' => 41.1579,
                'longitude' => -8.6451,
                'is_default' => true,
                'label' => 'Casa',
            ]);

            UserAddress::create([
                'user_id' => $customerOneUser->id,
                'street' => 'Rua dos Clerigos 64',
                'city' => 'Porto',
                'postal_code' => '4050-208',
                'country' => 'Portugal',
                'latitude' => 41.1456,
                'longitude' => -8.6133,
                'is_default' => false,
                'label' => 'Escritorio',
            ]);

            UserAddress::create([
                'user_id' => $customerTwoUser->id,
                'street' => 'Rua de Cedofeita 200',
                'city' => 'Porto',
                'postal_code' => '4050-178',
                'country' => 'Portugal',
                'latitude' => 41.1543,
                'longitude' => -8.6175,
                'is_default' => true,
                'label' => 'Casa',
            ]);

            // ----------------------------------------------------------------
            // Categorias + produtos
            // ----------------------------------------------------------------
            $catBurgers = Category::create([
                'chain_id' => $chain->id,
                'name' => 'Hamburgueres',
            ]);
            $catPizzas = Category::create([
                'chain_id' => $chain->id,
                'name' => 'Pizzas',
            ]);
            $catDrinks = Category::create([
                'chain_id' => $chain->id,
                'name' => 'Bebidas',
            ]);

            $classicBurger = Product::create([
                'category_id' => $catBurgers->id,
                'name' => 'Classic Burger',
                'price' => 7.50,
                'description' => 'Hamburguer bovino 180g, alface, tomate, molho da casa.',
            ]);

            $cheeseBurger = Product::create([
                'category_id' => $catBurgers->id,
                'name' => 'Cheese Burger',
                'price' => 8.50,
                'description' => 'Classic com queijo cheddar fundido.',
            ]);

            $pizzaMargherita = Product::create([
                'category_id' => $catPizzas->id,
                'name' => 'Margherita',
                'price' => 9.50,
                'description' => 'Mozzarella, tomate San Marzano e manjericao fresco.',
            ]);

            $pizzaPepperoni = Product::create([
                'category_id' => $catPizzas->id,
                'name' => 'Pepperoni',
                'price' => 10.50,
                'description' => 'Mozzarella, pepperoni picante e oregaos.',
            ]);

            $cocaCola = Product::create([
                'category_id' => $catDrinks->id,
                'name' => 'Coca-Cola',
                'price' => 2.00,
                'description' => 'Lata 330ml.',
            ]);

            $agua = Product::create([
                'category_id' => $catDrinks->id,
                'name' => 'Agua mineral',
                'price' => 1.00,
                'description' => 'Garrafa 500ml.',
            ]);

            // Option groups para os hamburgueres (Extras opcionais)
            foreach ([$classicBurger, $cheeseBurger] as $burger) {
                $extras = ProductOptionGroup::create([
                    'product_id' => $burger->id,
                    'name' => 'Extras',
                    'min_options' => 0,
                    'max_options' => 3,
                ]);
                ProductOption::create([
                    'option_group_id' => $extras->id,
                    'name' => 'Bacon',
                    'extra_price' => 1.00,
                    'default_option' => false,
                ]);
                ProductOption::create([
                    'option_group_id' => $extras->id,
                    'name' => 'Queijo extra',
                    'extra_price' => 0.50,
                    'default_option' => false,
                ]);
                ProductOption::create([
                    'option_group_id' => $extras->id,
                    'name' => 'Cebola caramelizada',
                    'extra_price' => 0.80,
                    'default_option' => false,
                ]);
            }

            // Option groups para as pizzas (Tamanho obrigatorio)
            foreach ([$pizzaMargherita, $pizzaPepperoni] as $pizza) {
                $sizes = ProductOptionGroup::create([
                    'product_id' => $pizza->id,
                    'name' => 'Tamanho',
                    'min_options' => 1,
                    'max_options' => 1,
                ]);
                ProductOption::create([
                    'option_group_id' => $sizes->id,
                    'name' => 'Pequena',
                    'extra_price' => 0,
                    'default_option' => false,
                ]);
                ProductOption::create([
                    'option_group_id' => $sizes->id,
                    'name' => 'Media',
                    'extra_price' => 0,
                    'default_option' => true,
                ]);
                ProductOption::create([
                    'option_group_id' => $sizes->id,
                    'name' => 'Grande',
                    'extra_price' => 3.00,
                    'default_option' => false,
                ]);
            }

            // ----------------------------------------------------------------
            // Disponibilidade por restaurante (RestaurantProduct)
            // ----------------------------------------------------------------
            $products = [$classicBurger, $cheeseBurger, $pizzaMargherita, $pizzaPepperoni, $cocaCola, $agua];

            foreach ($products as $product) {
                RestaurantProduct::create([
                    'restaurant_id' => $restaurantCentro->id,
                    'product_id' => $product->id,
                    'local_price' => $product->price,
                    'is_available' => true,
                    'estimated_preparation_time_min' => 12,
                ]);

                RestaurantProduct::create([
                    'restaurant_id' => $restaurantVNG->id,
                    'product_id' => $product->id,
                    'local_price' => round($product->price + 0.50, 2),
                    'is_available' => true,
                    'estimated_preparation_time_min' => 15,
                ]);
            }

            // ----------------------------------------------------------------
            // Campanhas: cupao + promocao
            // ----------------------------------------------------------------
            Coupon::create([
                'chain_id' => $chain->id,
                'code' => 'BEMVINDO',
                'description' => '10% de desconto no total da primeira encomenda.',
                'type' => 'PERCENTAGE',
                'target' => 'ORDER',
                'discount' => 10.0,
                'expiry_date' => now()->addDays(60),
            ]);

            Coupon::create([
                'chain_id' => $chain->id,
                'code' => 'FRETE0',
                'description' => 'Entrega gratuita em pedidos acima de 15 EUR.',
                'type' => 'FIXED_AMOUNT',
                'target' => 'DELIVERY',
                'discount' => 3.0,
                'expiry_date' => now()->addDays(30),
            ]);

            $pizzaPromo = Promotion::create([
                'chain_id' => $chain->id,
                'name' => 'Pizza Festa',
                'description' => '15% em todas as pizzas durante o fim de semana.',
                'type' => 'PERCENTAGE',
                'target' => 'CATEGORY',
                'discount' => 15.0,
                'start_date' => now()->subDay(),
                'end_date' => now()->addDays(7),
            ]);

            $pizzaPromo->promotionItems()->create([
                'item_id' => $catPizzas->id,
            ]);

            $this->command?->info('');
            $this->command?->info('===========================================');
            $this->command?->info('   FastBite — DemoSeeder executado.');
            $this->command?->info('===========================================');
            $this->command?->info('');
            $this->command?->info('Credenciais (password = "password" para todos):');
            $this->command?->info('  Chain manager: chain@fastbite.pt');
            $this->command?->info('  Local manager: local@fastbite.pt');
            $this->command?->info('  Cliente 1:     cliente@fastbite.pt');
            $this->command?->info('  Cliente 2:     cliente2@fastbite.pt');
            $this->command?->info('  Estafeta 1:    estafeta@fastbite.pt   (AVAILABLE)');
            $this->command?->info('  Estafeta 2:    estafeta2@fastbite.pt  (OFFLINE)');
            $this->command?->info('');
            $this->command?->info('Cupoes: BEMVINDO (-10% ate 5 EUR)  /  FRETE0 (-3 EUR entrega)');
            $this->command?->info('Promocao: "Pizza Festa" (-15% nas pizzas)');
            $this->command?->info('');
        });
    }

    /**
     * Apaga todos os dados das tabelas relevantes para garantir um seed limpo.
     * Order matters por causa das foreign keys.
     */
    private function wipe(): void
    {
        $tables = [
            'notifications',
            'user_push_tokens',
            'order_discounts',
            'payment_events',
            'order_events',
            'delivery_events',
            'delivery_offers',
            'courier_position_history',
            'messages',
            'chat_participants',
            'chats',
            'order_addresses',
            'order_item_options',
            'order_items',
            'deliveries',
            'payments',
            'orders',
            'cart_item_options',
            'cart_items',
            'carts',
            'reviews',
            'outbox_events',
            'promotion_items',
            'promotions',
            'coupons',
            'restaurant_products',
            'product_options',
            'product_option_groups',
            'products',
            'categories',
            'restaurant_addresses',
            'user_addresses',
            'chain_managers',
            'local_managers',
            'restaurants',
            'restaurant_chains',
            'couriers',
            'users',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->delete();
            }
        }
    }
}
