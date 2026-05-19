<?php

namespace Tests\Feature\GraphQL;

use App\Models\Courier;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Restaurant;
use App\Models\RestaurantChain;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UpdateDeliveryStatusMutationTest extends TestCase
{
    use RefreshDatabase;

    public function test_courier_can_mark_delivery_as_delivered_and_sync_order_status(): void
    {
        $customer = User::query()->create([
            'name' => 'Cliente Demo',
            'email' => 'cliente_delivery_status@example.com',
            'password' => 'password123',
            'user_type' => 'CUSTOMER',
        ]);

        $courierUser = User::query()->create([
            'name' => 'Estafeta Demo',
            'email' => 'estafeta_delivery_status@example.com',
            'password' => 'password123',
            'user_type' => 'COURIER',
        ]);

        Courier::query()->create([
            'user_id' => $courierUser->id,
            'status' => 'BUSY',
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
            'total' => 18.5,
            'restaurant_name_snapshot' => 'Urban Grill',
        ]);

        $delivery = Delivery::query()->create([
            'order_id' => $order->id,
            'courier_id' => $courierUser->id,
            'status' => 'IN_TRANSIT',
            'delivery_fee' => 2.5,
        ]);

        $mutation = <<<'GRAPHQL'
mutation MarkDeliveryDelivered($delivery_id: ID!, $courier_id: ID!) {
  markDeliveryDelivered(delivery_id: $delivery_id, courier_id: $courier_id) {
    id
    order_id
    status
    order {
      status
    }
  }
}
GRAPHQL;

        $response = $this
            ->actingAs($courierUser)
            ->postJson('/graphql', [
                'query' => $mutation,
                'variables' => [
                    'delivery_id' => $delivery->id,
                    'courier_id' => $courierUser->id,
                ],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.markDeliveryDelivered.id', $delivery->id)
            ->assertJsonPath('data.markDeliveryDelivered.order_id', $order->id)
            ->assertJsonPath('data.markDeliveryDelivered.status', 'DELIVERED')
            ->assertJsonPath('data.markDeliveryDelivered.order.status', 'DELIVERED');

        $delivery->refresh();
        $order->refresh();

        $this->assertSame('DELIVERED', $delivery->status->value);
        $this->assertNotNull($delivery->delivery_time);
        $this->assertSame('DELIVERED', $order->status->value);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id,
            'event_type' => 'ORDER_DELIVERED',
        ]);
    }

    public function test_invalid_delivery_transition_is_rejected(): void
    {
        $customer = User::query()->create([
            'name' => 'Cliente Demo',
            'email' => 'cliente_delivery_transition@example.com',
            'password' => 'password123',
            'user_type' => 'CUSTOMER',
        ]);

        $courierUser = User::query()->create([
            'name' => 'Estafeta Demo',
            'email' => 'estafeta_delivery_transition@example.com',
            'password' => 'password123',
            'user_type' => 'COURIER',
        ]);

        Courier::query()->create([
            'user_id' => $courierUser->id,
            'status' => 'BUSY',
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
            'status' => 'READY',
            'total' => 18.5,
            'restaurant_name_snapshot' => 'Urban Grill',
        ]);

        $delivery = Delivery::query()->create([
            'order_id' => $order->id,
            'courier_id' => $courierUser->id,
            'status' => 'PENDING',
            'delivery_fee' => 2.5,
        ]);

        $mutation = <<<'GRAPHQL'
mutation MarkDeliveryDelivered($delivery_id: ID!, $courier_id: ID!) {
  markDeliveryDelivered(delivery_id: $delivery_id, courier_id: $courier_id) {
    id
    status
  }
}
GRAPHQL;

        $response = $this
            ->actingAs($courierUser)
            ->postJson('/graphql', [
                'query' => $mutation,
                'variables' => [
                    'delivery_id' => $delivery->id,
                    'courier_id' => $courierUser->id,
                ],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.markDeliveryDelivered', null);

        $this->assertStringContainsString(
            'Invalid delivery transition from PENDING to DELIVERED.',
            $response->json('errors.0.message')
        );

        $delivery->refresh();
        $order->refresh();

        $this->assertSame('PENDING', $delivery->status->value);
        $this->assertSame('READY', $order->status->value);
    }
}
