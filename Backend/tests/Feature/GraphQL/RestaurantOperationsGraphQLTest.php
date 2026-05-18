<?php

namespace Tests\Feature\GraphQL;

use App\Models\LocalManager;
use App\Models\Order;
use App\Models\Restaurant;
use App\Models\RestaurantChain;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RestaurantOperationsGraphQLTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_manager_can_query_active_orders_for_own_restaurant(): void
    {
        $customer = User::query()->create([
            'name' => 'Cliente Query',
            'email' => 'customer_query_active@example.com',
            'password' => 'password123',
            'user_type' => 'CUSTOMER',
        ]);

        $manager = User::query()->create([
            'name' => 'Manager Local',
            'email' => 'manager_query_active@example.com',
            'password' => 'password123',
            'user_type' => 'LOCAL_MANAGER',
        ]);

        $chain = RestaurantChain::query()->create(['name' => 'FastBite Chain']);
        $restaurant = Restaurant::query()->create([
            'chain_id' => $chain->id,
            'name' => 'Urban Grill',
            'opening_hours' => '09:00',
            'closing_hours' => '23:00',
            'delivery_radius' => 10,
        ]);

        LocalManager::query()->create([
            'user_id' => $manager->id,
            'restaurant_id' => $restaurant->id,
        ]);

        $activeOrder = Order::query()->create([
            'user_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'status' => 'PENDING',
            'total' => 15,
            'restaurant_name_snapshot' => 'Urban Grill',
        ]);

        Order::query()->create([
            'user_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'status' => 'DELIVERED',
            'total' => 9,
            'restaurant_name_snapshot' => 'Urban Grill',
        ]);

        $query = <<<'GRAPHQL'
query ActiveOrders {
  restaurantActiveOrders {
    order_id
    restaurant_id
    order_status
  }
}
GRAPHQL;

        $response = $this
            ->actingAs($manager)
            ->postJson('/graphql', ['query' => $query]);

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data.restaurantActiveOrders')
            ->assertJsonPath('data.restaurantActiveOrders.0.order_id', $activeOrder->id)
            ->assertJsonPath('data.restaurantActiveOrders.0.order_status', 'PENDING');
    }

    public function test_local_manager_can_accept_and_reject_pending_orders(): void
    {
        $customer = User::query()->create([
            'name' => 'Cliente Manage',
            'email' => 'customer_manage_orders@example.com',
            'password' => 'password123',
            'user_type' => 'CUSTOMER',
        ]);

        $manager = User::query()->create([
            'name' => 'Manager Local',
            'email' => 'manager_manage_orders@example.com',
            'password' => 'password123',
            'user_type' => 'LOCAL_MANAGER',
        ]);

        $chain = RestaurantChain::query()->create(['name' => 'FastBite Chain']);
        $restaurant = Restaurant::query()->create([
            'chain_id' => $chain->id,
            'name' => 'Urban Grill',
            'opening_hours' => '09:00',
            'closing_hours' => '23:00',
            'delivery_radius' => 10,
        ]);

        LocalManager::query()->create([
            'user_id' => $manager->id,
            'restaurant_id' => $restaurant->id,
        ]);

        $orderToAccept = Order::query()->create([
            'user_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'status' => 'PENDING',
            'total' => 15,
            'restaurant_name_snapshot' => 'Urban Grill',
        ]);

        $orderToReject = Order::query()->create([
            'user_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'status' => 'PENDING',
            'total' => 11,
            'restaurant_name_snapshot' => 'Urban Grill',
        ]);

        $acceptMutation = <<<'GRAPHQL'
mutation AcceptOrder($input: RestaurantOrderActionInput!) {
  acceptRestaurantOrder(input: $input) {
    ok
    order_id
    status
  }
}
GRAPHQL;

        $rejectMutation = <<<'GRAPHQL'
mutation RejectOrder($input: RestaurantOrderActionInput!) {
  rejectRestaurantOrder(input: $input) {
    ok
    order_id
    status
  }
}
GRAPHQL;

        $acceptResponse = $this
            ->actingAs($manager)
            ->postJson('/graphql', [
                'query' => $acceptMutation,
                'variables' => ['input' => ['order_id' => $orderToAccept->id]],
            ]);

        $acceptResponse
            ->assertOk()
            ->assertJsonPath('data.acceptRestaurantOrder.ok', true)
            ->assertJsonPath('data.acceptRestaurantOrder.status', 'CONFIRMED');

        $rejectResponse = $this
            ->actingAs($manager)
            ->postJson('/graphql', [
                'query' => $rejectMutation,
                'variables' => ['input' => ['order_id' => $orderToReject->id]],
            ]);

        $rejectResponse
            ->assertOk()
            ->assertJsonPath('data.rejectRestaurantOrder.ok', true)
            ->assertJsonPath('data.rejectRestaurantOrder.status', 'CANCELLED');

        $this->assertDatabaseHas('orders', [
            'id' => $orderToAccept->id,
            'status' => 'CONFIRMED',
        ]);

        $this->assertDatabaseHas('orders', [
            'id' => $orderToReject->id,
            'status' => 'CANCELLED',
        ]);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $orderToAccept->id,
            'event_type' => 'ORDER_CONFIRMED',
        ]);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $orderToReject->id,
            'event_type' => 'ORDER_CANCELLED',
        ]);
    }
}

