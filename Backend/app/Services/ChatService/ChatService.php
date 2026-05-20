<?php

namespace App\Services\ChatService;

use App\Aspects\Transactional;
use App\DTOs\Chat\CreateOrderChatDTO;
use App\DTOs\Chat\SendMessageDTO;
use App\Enums\OrderStatus;
use App\Enums\UserType;
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
    public function sendChatMessage(string $senderUserId, SendMessageDTO $data): Message
    {
        $chat = Chat::query()
            ->with(['order.restaurant.localManager', 'order.restaurant.chain.chainManagers'])
            ->findOrFail($data->chat_id);

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
            ->first();

        // Auto-adicionar managers autorizados que ainda nao sejam participantes.
        // Espelha a logica de authorization do canal broadcast chat.{chatId}.
        if (! $participant) {
            $sender = User::query()->findOrFail($senderUserId);

            if (! $this->isAuthorizedManagerForChat($sender, $chat)) {
                throw ValidationException::withMessages([
                    'sender_user_id' => 'User is not a participant of this chat.',
                ]);
            }

            $participant = ChatParticipant::query()->create([
                'chat_id' => $data->chat_id,
                'user_id' => $sender->id,
                'user_type' => $sender->user_type->value ?? $sender->user_type,
                'joined_at' => now(),
            ]);
        }

        return Message::query()->create([
            'chat_id' => $data->chat_id,
            'sender_participant_id' => $participant->id,
            'content' => $data->content,
            'timestamp' => now(),
        ]);
    }

    private function isAuthorizedManagerForChat(User $user, Chat $chat): bool
    {
        $restaurant = $chat->order?->restaurant;

        if (! $restaurant) {
            return false;
        }

        if ($user->user_type === UserType::LOCAL_MANAGER) {
            return $restaurant->localManager
                && $restaurant->localManager->user_id === $user->id;
        }

        if ($user->user_type === UserType::CHAIN_MANAGER) {
            return $restaurant->chain
                && $restaurant->chain->chainManagers->contains('user_id', $user->id);
        }

        return false;
    }
}
