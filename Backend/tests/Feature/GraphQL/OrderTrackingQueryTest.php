<?php

namespace Tests\Feature\GraphQL;

use App\Models\Courier;
use App\Models\CourierPositionHistory;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Restaurant;
use App\Models\RestaurantChain;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTrackingQueryTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_query_own_order_tracking(): void
    {
        $customer = User::query()->create([
            'name' => 'Cliente Demo',
            'email' => 'cliente_tracking@example.com',
            'password' => 'password123',
            'user_type' => 'customer',
        ]);

        $courierUser = User::query()->create([
            'name' => 'Estafeta Demo',
            'email' => 'estafeta_tracking@example.com',
            'password' => 'password123',
            'user_type' => 'courier',
        ]);

        Courier::query()->create([
            'user_id' => $courierUser->id,
            'status' => 'AVAILABLE',
            'latitude' => 41.1578,
            'longitude' => -8.6290,
            'last_location_update' => now(),
        ]);

        $chain = RestaurantChain::query()->create(['name' => 'FastBite Chain']);
        $restaurant = Restaurant::query()->create([
            'chain_id' => $chain->id,
            'name' => 'Urban Grill',
            'opening_hours' => '09:00',
            'closing_hours' => '23:00',
            'delivery_radius' => 10,
        ]);

        $order = Order::query()->create([
            'user_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'status' => 'OUT_FOR_DELIVERY',
            'total' => 20,
            'restaurant_name_snapshot' => 'Urban Grill',
        ]);

        $delivery = Delivery::query()->create([
            'order_id' => $order->id,
            'courier_id' => $courierUser->id,
            'status' => 'IN_TRANSIT',
            'delivery_fee' => 2.5,
        ]);

        CourierPositionHistory::query()->create([
            'delivery_id' => $delivery->id,
            'latitude' => 41.1579,
            'longitude' => -8.6291,
            'timestamp' => now()->subMinute(),
        ]);

        CourierPositionHistory::query()->create([
            'delivery_id' => $delivery->id,
            'latitude' => 41.1585,
            'longitude' => -8.6284,
            'timestamp' => now(),
        ]);

        OrderEvent::query()->create([
            'order_id' => $order->id,
            'event_type' => 'ORDER_OUT_FOR_DELIVERY',
            'timestamp' => now(),
            'payload' => ['source' => 'test'],
        ]);

        $query = <<<'GRAPHQL'
query OrderTracking($orderId: ID!) {
  orderTracking(order_id: $orderId) {
    order_id
    order_status
    delivery_id
    delivery_status
    courier_id
    latest_position {
      lat
      lng
    }
    positions {
      lat
      lng
    }
    events {
      event_type
    }
  }
}
GRAPHQL;

        $response = $this
            ->actingAs($customer)
            ->postJson('/graphql', [
                'query' => $query,
                'variables' => ['orderId' => $order->id],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.orderTracking.order_id', $order->id)
            ->assertJsonPath('data.orderTracking.order_status', 'OUT_FOR_DELIVERY')
            ->assertJsonPath('data.orderTracking.delivery_id', $delivery->id)
            ->assertJsonPath('data.orderTracking.delivery_status', 'IN_TRANSIT')
            ->assertJsonPath('data.orderTracking.courier_id', $courierUser->id)
            ->assertJsonPath('data.orderTracking.latest_position.lat', 41.1585)
            ->assertJsonPath('data.orderTracking.events.0.event_type', 'ORDER_OUT_FOR_DELIVERY');

        $this->assertCount(2, $response->json('data.orderTracking.positions'));
    }

    public function test_user_cannot_query_tracking_of_other_customer_order(): void
    {
        $owner = User::query()->create([
            'name' => 'Cliente Owner',
            'email' => 'owner_tracking@example.com',
            'password' => 'password123',
            'user_type' => 'customer',
        ]);

        $otherCustomer = User::query()->create([
            'name' => 'Cliente Outro',
            'email' => 'other_tracking@example.com',
            'password' => 'password123',
            'user_type' => 'customer',
        ]);

        $courierUser = User::query()->create([
            'name' => 'Estafeta Demo',
            'email' => 'courier_tracking_other@example.com',
            'password' => 'password123',
            'user_type' => 'courier',
        ]);

        Courier::query()->create([
            'user_id' => $courierUser->id,
            'status' => 'AVAILABLE',
        ]);

        $chain = RestaurantChain::query()->create(['name' => 'FastBite Chain']);
        $restaurant = Restaurant::query()->create([
            'chain_id' => $chain->id,
            'name' => 'Urban Grill',
            'opening_hours' => '09:00',
            'closing_hours' => '23:00',
            'delivery_radius' => 10,
        ]);

        $order = Order::query()->create([
            'user_id' => $owner->id,
            'restaurant_id' => $restaurant->id,
            'status' => 'OUT_FOR_DELIVERY',
            'total' => 20,
            'restaurant_name_snapshot' => 'Urban Grill',
        ]);

        Delivery::query()->create([
            'order_id' => $order->id,
            'courier_id' => $courierUser->id,
            'status' => 'IN_TRANSIT',
            'delivery_fee' => 2.5,
        ]);

        $query = <<<'GRAPHQL'
query OrderTracking($orderId: ID!) {
  orderTracking(order_id: $orderId) {
    order_id
  }
}
GRAPHQL;

        $response = $this
            ->actingAs($otherCustomer)
            ->postJson('/graphql', [
                'query' => $query,
                'variables' => ['orderId' => $order->id],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.orderTracking', null);

        $this->assertStringContainsString(
            'Not authorized to access this order tracking.',
            $response->json('errors.0.message')
        );
    }
}
