<?php

namespace App\Services\ChatService;

use App\DTOs\Chat\CreateOrderChatDTO;
use App\DTOs\Chat\SendMessageDTO;
use App\Models\Chat;
use App\Models\Message;

interface ChatServiceInterface
{
    public function getChatsByOrderId(string $orderId);

    public function getChatById(string $id): ?Chat;

    public function getMessagesByChatId(string $chatId, int $page, int $perPage);

    public function getParticipantsByChatId(string $chatId);

    public function createOrderChat(string $actorUserId, CreateOrderChatDTO $data): Chat;

    public function sendChatMessage(string $senderUserId, SendMessageDTO $data): Message;
}
