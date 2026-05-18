<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $chainManagers = DB::table('users')
            ->where('user_type', 'CHAIN_MANAGER')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('chain_managers')
                    ->whereColumn('chain_managers.user_id', 'users.id');
            })
            ->get(['id', 'name']);

        foreach ($chainManagers as $manager) {
            $chainId = (string) Str::uuid();
            DB::table('restaurant_chains')->insert([
                'id' => $chainId,
                'name' => "Chain {$manager->name}",
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('chain_managers')->insert([
                'user_id' => $manager->id,
                'chain_id' => $chainId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $restaurantId = (string) Str::uuid();
            DB::table('restaurants')->insert([
                'id' => $restaurantId,
                'chain_id' => $chainId,
                'name' => "Rest {$manager->name}",
                'opening_hours' => '09:00',
                'closing_hours' => '23:00',
                'delivery_radius' => 7,
                'rating_sum' => 0,
                'rating_count' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('restaurant_addresses')->insert([
                'id' => (string) Str::uuid(),
                'restaurant_id' => $restaurantId,
                'street' => 'Rua Principal 1',
                'city' => 'Lisboa',
                'postal_code' => '1000-001',
                'country' => 'PT',
                'latitude' => 38.7223,
                'longitude' => -9.1393,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('local_managers')->updateOrInsert(
                ['user_id' => $manager->id],
                [
                    'restaurant_id' => $restaurantId,
                    'updated_at' => $now,
                    'created_at' => $now,
                ],
            );
        }

        $firstRestaurantId = DB::table('restaurants')->orderBy('created_at')->value('id');
        if (! $firstRestaurantId) {
            return;
        }

        $localManagers = DB::table('users')
            ->where('user_type', 'LOCAL_MANAGER')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('local_managers')
                    ->whereColumn('local_managers.user_id', 'users.id');
            })
            ->pluck('id');

        foreach ($localManagers as $userId) {
            DB::table('local_managers')->insert([
                'user_id' => $userId,
                'restaurant_id' => $firstRestaurantId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        // no-op
    }
};

