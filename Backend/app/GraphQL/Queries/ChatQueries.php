<?php

namespace App\GraphQL\Queries;

use App\Services\ChatService\ChatServiceInterface;

class ChatQueries
{
    public function __construct(private ChatServiceInterface $chatService)
    {
    }

    public function orderChats($_, array $args)
    {
        return $this->chatService->getChatsByOrderId($args['order_id']);
    }

    public function chat($_, array $args)
    {
        return $this->chatService->getChatById($args['id']);
    }

    public function chatMessages($_, array $args)
    {
        return $this->chatService->getMessagesByChatId($args['chat_id'], $args['page'], $args['per_page']);
    }

    public function chatParticipants($_, array $args)
    {
        return $this->chatService->getParticipantsByChatId($args['chat_id']);
    }
}
