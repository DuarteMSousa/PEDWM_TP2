<?php

namespace App\Services\ChatService;

use App\DTOs\Chat\AddChatParticipantDTO;
use App\DTOs\Chat\CreateOrderChatDTO;
use App\DTOs\Chat\SendMessageDTO;
use App\Models\Chat;
use App\Models\ChatParticipant;
use App\Models\Message;

interface ChatServiceInterface
{
    public function forOrder(string $orderId);

    public function find(string $id): ?Chat;

    public function messages(string $chatId, int $page, int $perPage);

    public function participants(string $chatId);

    public function createOrderChat(string $actorUserId, CreateOrderChatDTO $data): Chat;

    public function close(string $chatId): Chat;

    public function addParticipant(string $actorUserId, AddChatParticipantDTO $data): ChatParticipant;

    public function removeParticipant(string $participantId): bool;

    public function sendMessage(string $senderUserId, SendMessageDTO $data): Message;

    public function markAsRead(string $chatId, string $userId): ChatParticipant;
}
