<?php

namespace Tests\Feature\GraphQL;

use App\Events\CourierPositionUpdated;
use App\Models\Courier;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Restaurant;
use App\Models\RestaurantChain;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class UpdateCourierLocationMutationTest extends TestCase
{
    use RefreshDatabase;

    public function test_courier_can_update_location_and_broadcast_event(): void
    {
        Event::fake([CourierPositionUpdated::class]);

        $customer = User::query()->create([
            'name' => 'Cliente Demo',
            'email' => 'cliente@example.com',
            'password' => 'password123',
            'user_type' => 'CUSTOMER',
        ]);

        $courierUser = User::query()->create([
            'name' => 'Estafeta Demo',
            'email' => 'estafeta@example.com',
            'password' => 'password123',
            'user_type' => 'COURIER',
        ]);

        Courier::query()->create([
            'user_id' => $courierUser->id,
            'status' => 'AVAILABLE',
        ]);

        $chain = RestaurantChain::query()->create([
            'name' => 'FastBite Chain',
        ]);

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
mutation UpdateCourierLocation($input: UpdateCourierLocationInput!) {
  updateCourierLocation(input: $input) {
    ok
    delivery_id
    recorded_at
  }
}
GRAPHQL;

        $variables = [
            'input' => [
                'courier_id' => $courierUser->id,
                'delivery_id' => $delivery->id,
                'latitude' => 41.1579,
                'longitude' => -8.6291,
                'heading' => 120.5,
                'speed' => 9.2,
                'accuracy' => 6.1,
                'recorded_at' => now()->format('Y-m-d H:i:s'),
            ],
        ];

        $response = $this
            ->actingAs($courierUser)
            ->postJson('/graphql', [
                'query' => $mutation,
                'variables' => $variables,
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.updateCourierLocation.ok', true)
            ->assertJsonPath('data.updateCourierLocation.delivery_id', $delivery->id);

        $this->assertDatabaseHas('couriers', [
            'user_id' => $courierUser->id,
            'latitude' => 41.1579,
            'longitude' => -8.6291,
        ]);

        $this->assertDatabaseHas('courier_position_history', [
            'delivery_id' => $delivery->id,
            'latitude' => 41.1579,
            'longitude' => -8.6291,
        ]);

        Event::assertDispatched(CourierPositionUpdated::class);
    }
}
