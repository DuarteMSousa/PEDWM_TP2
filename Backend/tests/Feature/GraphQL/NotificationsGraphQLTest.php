<?php

namespace Tests\Feature\GraphQL;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationsGraphQLTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_own_notifications_with_unread_filter(): void
    {
        $user = User::query()->create([
            'name' => 'User Notif',
            'email' => 'user_notif@example.com',
            'password' => 'password123',
            'user_type' => 'CUSTOMER',
        ]);

        $otherUser = User::query()->create([
            'name' => 'Other Notif',
            'email' => 'other_notif@example.com',
            'password' => 'password123',
            'user_type' => 'CUSTOMER',
        ]);

        Notification::query()->create([
            'user_id' => $user->id,
            'type' => 'ORDER_UPDATE',
            'title' => 'Pedido confirmado',
            'message' => 'O teu pedido foi confirmado.',
            'sent_at' => now()->subMinutes(2),
            'read_at' => null,
        ]);

        Notification::query()->create([
            'user_id' => $user->id,
            'type' => 'PROMOTION',
            'title' => 'Promo ativa',
            'message' => 'Desconto de 10% hoje.',
            'sent_at' => now()->subMinute(),
            'read_at' => now()->subSeconds(30),
        ]);

        Notification::query()->create([
            'user_id' => $otherUser->id,
            'type' => 'SYSTEM',
            'title' => 'Outro utilizador',
            'message' => 'Nao deve aparecer.',
            'sent_at' => now(),
            'read_at' => null,
        ]);

        $query = <<<'GRAPHQL'
query Notifications($unreadOnly: Boolean!, $limit: Int!) {
  userNotifications(unread_only: $unreadOnly, limit: $limit) {
    id
    type
    title
    read_at
  }
}
GRAPHQL;

        $allResponse = $this
            ->actingAs($user)
            ->postJson('/graphql', [
                'query' => $query,
                'variables' => [
                    'unreadOnly' => false,
                    'limit' => 10,
                ],
            ]);

        $allResponse
            ->assertOk()
            ->assertJsonCount(2, 'data.userNotifications');

        $unreadResponse = $this
            ->actingAs($user)
            ->postJson('/graphql', [
                'query' => $query,
                'variables' => [
                    'unreadOnly' => true,
                    'limit' => 10,
                ],
            ]);

        $unreadResponse
            ->assertOk()
            ->assertJsonCount(1, 'data.userNotifications')
            ->assertJsonPath('data.userNotifications.0.type', 'ORDER_UPDATE')
            ->assertJsonPath('data.userNotifications.0.title', 'Pedido confirmado')
            ->assertJsonPath('data.userNotifications.0.read_at', null);
    }

    public function test_user_can_mark_single_notification_as_read(): void
    {
        $user = User::query()->create([
            'name' => 'User Mark One',
            'email' => 'user_mark_one@example.com',
            'password' => 'password123',
            'user_type' => 'CUSTOMER',
        ]);

        $notification = Notification::query()->create([
            'user_id' => $user->id,
            'type' => 'ORDER_UPDATE',
            'title' => 'Pedido enviado',
            'message' => 'A encomenda saiu para entrega.',
            'sent_at' => now()->subMinute(),
            'read_at' => null,
        ]);

        $mutation = <<<'GRAPHQL'
mutation MarkOne($input: MarkNotificationReadInput!) {
  markNotificationRead(input: $input) {
    ok
    notification_id
    read_at
  }
}
GRAPHQL;

        $response = $this
            ->actingAs($user)
            ->postJson('/graphql', [
                'query' => $mutation,
                'variables' => [
                    'input' => ['notification_id' => $notification->id],
                ],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.markNotificationRead.ok', true)
            ->assertJsonPath('data.markNotificationRead.notification_id', $notification->id);

        $notification->refresh();
        $this->assertNotNull($notification->read_at);
    }

    public function test_user_can_mark_all_own_unread_notifications_as_read(): void
    {
        $user = User::query()->create([
            'name' => 'User Mark All',
            'email' => 'user_mark_all@example.com',
            'password' => 'password123',
            'user_type' => 'CUSTOMER',
        ]);

        Notification::query()->create([
            'user_id' => $user->id,
            'type' => 'ORDER_UPDATE',
            'title' => 'N1',
            'message' => 'M1',
            'sent_at' => now()->subMinutes(3),
            'read_at' => null,
        ]);

        Notification::query()->create([
            'user_id' => $user->id,
            'type' => 'SYSTEM',
            'title' => 'N2',
            'message' => 'M2',
            'sent_at' => now()->subMinutes(2),
            'read_at' => null,
        ]);

        Notification::query()->create([
            'user_id' => $user->id,
            'type' => 'PROMOTION',
            'title' => 'N3',
            'message' => 'M3',
            'sent_at' => now()->subMinute(),
            'read_at' => now()->subSeconds(15),
        ]);

        $mutation = <<<'GRAPHQL'
mutation MarkAll {
  markAllNotificationsRead {
    ok
    affected_count
  }
}
GRAPHQL;

        $response = $this
            ->actingAs($user)
            ->postJson('/graphql', ['query' => $mutation]);

        $response
            ->assertOk()
            ->assertJsonPath('data.markAllNotificationsRead.ok', true)
            ->assertJsonPath('data.markAllNotificationsRead.affected_count', 2);

        $unreadCount = Notification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        $this->assertSame(0, $unreadCount);
    }
}

