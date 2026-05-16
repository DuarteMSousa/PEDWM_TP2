<?php

namespace App\Services\ChatService;

use App\DTOs\Chat\AddChatParticipantDTO;
use App\DTOs\Chat\CreateOrderChatDTO;
use App\DTOs\Chat\SendMessageDTO;
use App\Models\Chat;
use App\Models\ChatParticipant;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ChatService implements ChatServiceInterface
{
    public function forOrder(string $orderId)
    {
        return Chat::query()
            ->with(['participants', 'messages'])
            ->where('order_id', $orderId)
            ->orderBy('created_at')
            ->get();
    }

    public function find(string $id): ?Chat
    {
        return Chat::query()->with(['participants', 'messages'])->find($id);
    }

    public function messages(string $chatId, int $page, int $perPage)
    {
        return Message::query()
            ->where('chat_id', $chatId)
            ->orderByDesc('timestamp')
            ->paginate($perPage, ['*'], 'page', $page)
            ->items();
    }

    public function participants(string $chatId)
    {
        return ChatParticipant::query()
            ->where('chat_id', $chatId)
            ->orderBy('joined_at')
            ->get();
    }

    public function createOrderChat(string $actorUserId, CreateOrderChatDTO $data): Chat
    {
        return DB::transaction(function () use ($data) {
            $chat = Chat::query()->create([
                'order_id' => $data->order_id,
                'type' => $data->type->value,
            ]);

            foreach ($data->participant_user_ids as $userId) {
                $user = User::query()->findOrFail($userId);
                $chat->participants()->create([
                    'user_id' => $user->id,
                    'user_type' => $user->user_type->value ?? $user->user_type,
                    'joined_at' => now(),
                ]);
            }

            return $chat->load(['participants', 'messages']);
        });
    }

    public function close(string $chatId): Chat
    {
        $chat = Chat::query()->findOrFail($chatId);
        $chat->update(['closed_at' => now()]);

        return $chat->refresh()->load(['participants', 'messages']);
    }

    public function addParticipant(string $actorUserId, AddChatParticipantDTO $data): ChatParticipant
    {
        return ChatParticipant::query()->create([
            'chat_id' => $data->chat_id,
            'user_id' => $data->user_id,
            'user_type' => $data->user_type,
            'joined_at' => now(),
        ]);
    }

    public function removeParticipant(string $participantId): bool
    {
        return (bool) ChatParticipant::query()->whereKey($participantId)->delete();
    }

    public function sendMessage(string $senderUserId, SendMessageDTO $data): Message
    {
        $participant = ChatParticipant::query()
            ->where('chat_id', $data->chat_id)
            ->where('user_id', $senderUserId)
            ->firstOrFail();

        return Message::query()->create([
            'chat_id' => $data->chat_id,
            'sender_participant_id' => $participant->id,
            'content' => $data->content,
            'timestamp' => now(),
        ]);
    }

    public function markAsRead(string $chatId, string $userId): ChatParticipant
    {
        $participant = ChatParticipant::query()
            ->where('chat_id', $chatId)
            ->where('user_id', $userId)
            ->firstOrFail();
        $participant->update(['last_read_at' => now()]);

        return $participant;
    }
}
