<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Chat\AddChatParticipantDTO;
use App\DTOs\Chat\CreateOrderChatDTO;
use App\DTOs\Chat\SendMessageDTO;
use App\Services\ChatService\ChatServiceInterface;

class ChatMutations
{
    public function __construct(private ChatServiceInterface $chatService)
    {
    }

    public function createOrderChat($_, array $args)
    {
        return $this->chatService->createOrderChat($args['actor_user_id'] ?? 'system', CreateOrderChatDTO::from($args['input']));
    }

    public function closeChat($_, array $args)
    {
        return $this->chatService->close($args['chat_id']);
    }

    public function addChatParticipant($_, array $args)
    {
        return $this->chatService->addParticipant($args['actor_user_id'] ?? 'system', AddChatParticipantDTO::from($args['input']));
    }

    public function removeChatParticipant($_, array $args): bool
    {
        return $this->chatService->removeParticipant($args['participant_id']);
    }

    public function sendMessage($_, array $args)
    {
        return $this->chatService->sendMessage($args['input']['sender_user_id'], SendMessageDTO::from($args['input']));
    }

    public function markChatAsRead($_, array $args)
    {
        return $this->chatService->markAsRead($args['chat_id'], $args['user_id']);
    }
}
