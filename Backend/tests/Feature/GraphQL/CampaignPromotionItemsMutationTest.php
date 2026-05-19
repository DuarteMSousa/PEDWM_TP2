<?php

namespace Tests\Feature\GraphQL;

use App\Models\Category;
use App\Models\RestaurantChain;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampaignPromotionItemsMutationTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_promotion_uses_parent_discount_and_item_id_only(): void
    {
        $chain = RestaurantChain::query()->create(['name' => 'FastBite']);
        $category = Category::query()->create([
            'chain_id' => $chain->id,
            'name' => 'Pizzas',
        ]);

        $mutation = <<<'GRAPHQL'
mutation CreatePromotion($actor_user_id: ID!, $input: CreatePromotionInput!) {
  createPromotion(actor_user_id: $actor_user_id, input: $input) {
    id
    discount
    promotionItems {
      parent_type
      parent_id
      item_id
    }
  }
}
GRAPHQL;

        $response = $this->postJson('/graphql', [
            'query' => $mutation,
            'variables' => [
                'actor_user_id' => 'system',
                'input' => [
                    'chain_id' => $chain->id,
                    'name' => 'Pizza Festa',
                    'description' => '15% nas pizzas',
                    'type' => 'PERCENTAGE',
                    'target' => 'CATEGORY',
                    'discount' => 15,
                    'items' => [
                        ['item_id' => $category->id],
                    ],
                ],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.createPromotion.discount', 15)
            ->assertJsonPath('data.createPromotion.promotionItems.0.parent_type', 'PROMOTION')
            ->assertJsonPath('data.createPromotion.promotionItems.0.item_id', $category->id);

        $promotionId = $response->json('data.createPromotion.id');
        $this->assertDatabaseHas('promotion_items', [
            'parent_type' => 'PROMOTION',
            'parent_id' => $promotionId,
            'item_id' => $category->id,
        ]);
    }

    public function test_promotion_item_input_rejects_discount_field(): void
    {
        $chain = RestaurantChain::query()->create(['name' => 'FastBite']);
        $category = Category::query()->create([
            'chain_id' => $chain->id,
            'name' => 'Pizzas',
        ]);

        $mutation = <<<'GRAPHQL'
mutation CreatePromotion($actor_user_id: ID!, $input: CreatePromotionInput!) {
  createPromotion(actor_user_id: $actor_user_id, input: $input) {
    id
  }
}
GRAPHQL;

        $response = $this->postJson('/graphql', [
            'query' => $mutation,
            'variables' => [
                'actor_user_id' => 'system',
                'input' => [
                    'chain_id' => $chain->id,
                    'name' => 'Pizza Festa',
                    'description' => '15% nas pizzas',
                    'type' => 'PERCENTAGE',
                    'target' => 'CATEGORY',
                    'discount' => 15,
                    'items' => [
                        [
                            'item_id' => $category->id,
                            'discount' => 15,
                        ],
                    ],
                ],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure(['errors']);

        $this->assertStringContainsString(
            'discount',
            $response->json('errors.0.message', ''),
        );
    }
}
