<?php

namespace App\GraphQL\Queries;

use App\Services\ChatService\ChatServiceInterface;

class ChatQueries
{
    public function __construct(private ChatServiceInterface $chatService) {}

    public function getChatsByOrderId($_, array $args)
    {
        return $this->chatService->getChatsByOrderId($args['order_id']);
    }

    public function getChatById($_, array $args)
    {
        return $this->chatService->getChatById($args['id']);
    }

    public function getMessagesByChatId($_, array $args)
    {
        return $this->chatService->getMessagesByChatId($args['chat_id'], $args['page'], $args['per_page']);
    }

    public function getParticipantsByChatId($_, array $args)
    {
        return $this->chatService->getParticipantsByChatId($args['chat_id']);
    }
}
