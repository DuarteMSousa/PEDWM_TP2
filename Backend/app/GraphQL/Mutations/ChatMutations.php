<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Chat\CreateOrderChatDTO;
use App\DTOs\Chat\SendMessageDTO;
use App\Services\ChatService\ChatServiceInterface;

class ChatMutations
{
    public function __construct(private ChatServiceInterface $chatService) {}

    public function createOrderChat($_, array $args)
    {
        return $this->chatService->createOrderChat($args['actor_user_id'] ?? 'system', CreateOrderChatDTO::from($args['input']));
    }

    public function sendChatMessage($_, array $args)
    {
        return $this->chatService->sendChatMessage($args['input']['sender_user_id'], SendMessageDTO::from($args['input']));
    }
}
