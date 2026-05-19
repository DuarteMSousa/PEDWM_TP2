<?php

namespace App\Services\ChatService;

use App\Aspects\Transactional;
use App\DTOs\Chat\AddChatParticipantDTO;
use App\DTOs\Chat\CreateOrderChatDTO;
use App\DTOs\Chat\SendMessageDTO;
use App\Enums\OrderStatus;
use App\Models\Chat;
use App\Models\ChatParticipant;
use App\Models\Message;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class ChatService implements ChatServiceInterface
{
    public function getChatsByOrderId(string $orderId)
    {
        return Chat::query()
            ->with(['participants', 'messages'])
            ->where('order_id', $orderId)
            ->orderBy('created_at')
            ->get();
    }

    public function getChatById(string $id): ?Chat
    {
        return Chat::query()->with(['participants', 'messages'])->find($id);
    }

    public function getMessagesByChatId(string $chatId, int $page, int $perPage)
    {
        return Message::query()
            ->where('chat_id', $chatId)
            ->orderByDesc('timestamp')
            ->paginate($perPage, ['*'], 'page', $page)
            ->items();
    }

    public function getParticipantsByChatId(string $chatId)
    {
        return ChatParticipant::query()
            ->where('chat_id', $chatId)
            ->orderBy('joined_at')
            ->get();
    }

    #[Transactional]
    public function createOrderChat(string $actorUserId, CreateOrderChatDTO $data): Chat
    {
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
    }

    #[Transactional]
    public function closeChat(string $chatId): Chat
    {
        $chat = Chat::query()->findOrFail($chatId);
        $chat->update(['closed_at' => now()]);

        return $chat->refresh()->load(['participants', 'messages']);
    }

    #[Transactional]
    public function addChatParticipant(string $actorUserId, AddChatParticipantDTO $data): ChatParticipant
    {
        return ChatParticipant::query()->create([
            'chat_id' => $data->chat_id,
            'user_id' => $data->user_id,
            'user_type' => $data->user_type,
            'joined_at' => now(),
        ]);
    }

    #[Transactional]
    public function removeChatParticipant(string $participantId): bool
    {
        return (bool) ChatParticipant::query()->whereKey($participantId)->delete();
    }

    #[Transactional]
    public function sendChatMessage(string $senderUserId, SendMessageDTO $data): Message
    {
        $chat = Chat::query()->with('order')->findOrFail($data->chat_id);

        if ($chat->closed_at !== null) {
            throw ValidationException::withMessages([
                'chat_id' => 'Chat is closed.',
            ]);
        }

        if ($chat->order && $chat->order->status === OrderStatus::CANCELLED) {
            throw ValidationException::withMessages([
                'chat_id' => 'Order was cancelled. Chat is no longer available.',
            ]);
        }

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

    #[Transactional]
    public function markChatAsRead(string $chatId, string $userId): ChatParticipant
    {
        $participant = ChatParticipant::query()
            ->where('chat_id', $chatId)
            ->where('user_id', $userId)
            ->firstOrFail();
        $participant->update(['last_read_at' => now()]);

        return $participant;
    }
}
