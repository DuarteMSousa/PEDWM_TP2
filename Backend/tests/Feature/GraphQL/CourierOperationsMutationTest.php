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

class CourierOperationsMutationTest extends TestCase
{
    use RefreshDatabase;

    public function test_courier_can_toggle_availability(): void
    {
        $courierUser = User::query()->create([
            'name' => 'Estafeta Toggle',
            'email' => 'courier_toggle@example.com',
            'password' => 'password123',
            'user_type' => 'COURIER',
        ]);

        Courier::query()->create([
            'user_id' => $courierUser->id,
            'status' => 'AVAILABLE',
        ]);

        $mutation = <<<'GRAPHQL'
mutation ToggleAvailability($input: ToggleCourierAvailabilityInput!) {
  toggleCourierAvailability(input: $input) {
    ok
    courier_id
    status
  }
}
GRAPHQL;

        $response = $this
            ->actingAs($courierUser)
            ->postJson('/graphql', [
                'query' => $mutation,
                'variables' => ['input' => ['status' => 'OFFLINE']],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.toggleCourierAvailability.ok', true)
            ->assertJsonPath('data.toggleCourierAvailability.courier_id', $courierUser->id)
            ->assertJsonPath('data.toggleCourierAvailability.status', 'OFFLINE');

        $this->assertDatabaseHas('couriers', [
            'user_id' => $courierUser->id,
            'status' => 'OFFLINE',
        ]);
    }

    public function test_courier_can_accept_pending_delivery_job(): void
    {
        $customer = User::query()->create([
            'name' => 'Cliente Delivery Job',
            'email' => 'customer_delivery_job@example.com',
            'password' => 'password123',
            'user_type' => 'CUSTOMER',
        ]);

        $courierUser = User::query()->create([
            'name' => 'Estafeta Job',
            'email' => 'courier_job@example.com',
            'password' => 'password123',
            'user_type' => 'COURIER',
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
            'user_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'status' => 'CONFIRMED',
            'total' => 18.5,
            'restaurant_name_snapshot' => 'Urban Grill',
        ]);

        $delivery = Delivery::query()->create([
            'order_id' => $order->id,
            'courier_id' => null,
            'status' => 'PENDING',
            'delivery_fee' => 2.5,
        ]);

        $mutation = <<<'GRAPHQL'
mutation AcceptDeliveryJob($input: AcceptDeliveryJobInput!) {
  acceptDeliveryJob(input: $input) {
    ok
    delivery_id
    order_id
    courier_id
    delivery_status
  }
}
GRAPHQL;

        $response = $this
            ->actingAs($courierUser)
            ->postJson('/graphql', [
                'query' => $mutation,
                'variables' => ['input' => ['delivery_id' => $delivery->id]],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.acceptDeliveryJob.ok', true)
            ->assertJsonPath('data.acceptDeliveryJob.delivery_id', $delivery->id)
            ->assertJsonPath('data.acceptDeliveryJob.order_id', $order->id)
            ->assertJsonPath('data.acceptDeliveryJob.courier_id', $courierUser->id)
            ->assertJsonPath('data.acceptDeliveryJob.delivery_status', 'PENDING');

        $this->assertDatabaseHas('deliveries', [
            'id' => $delivery->id,
            'courier_id' => $courierUser->id,
            'status' => 'PENDING',
        ]);

        $this->assertDatabaseHas('couriers', [
            'user_id' => $courierUser->id,
            'status' => 'BUSY',
        ]);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id,
            'event_type' => 'ORDER_COURIER_ASSIGNED',
        ]);
    }
}

