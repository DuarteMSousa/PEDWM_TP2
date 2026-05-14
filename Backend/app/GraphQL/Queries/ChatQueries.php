<?php

namespace App\GraphQL\Queries;

use App\Models\Chat;
use App\Models\ChatParticipant;
use App\Support\ResolvesAuthenticatedUser;
use GraphQL\Error\UserError;

class ChatQueries
{
    use ResolvesAuthenticatedUser;

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, array<string, mixed>>
     */
    public function myChats(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $limit = max(1, min((int) ($args['limit'] ?? 20), 100));

        $chats = Chat::query()
            ->with([
                'participants.user',
                'messages' => fn ($query) => $query->orderByDesc('timestamp')->limit(1),
            ])
            ->whereHas('participants', fn ($query) => $query->where('user_id', $user->id))
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get();

        return $chats->map(function (Chat $chat) use ($user): array {
            $me = $chat->participants->first(fn ($p) => $p->user_id === $user->id);
            $lastReadAt = $me?->last_read_at;
            $lastMessage = $chat->messages->first();

            $unreadCount = $chat->messages()
                ->where('timestamp', '>', $lastReadAt ?? now()->subYears(10))
                ->whereHas('senderParticipant', fn ($q) => $q->where('user_id', '!=', $user->id))
                ->count();

            return [
                'id' => $chat->id,
                'order_id' => $chat->order_id,
                'type' => $chat->type->value,
                'closed_at' => $chat->closed_at?->toIso8601String(),
                'participants' => $chat->participants->map(fn ($participant): array => [
                    'user_id' => $participant->user_id,
                    'user_type' => $participant->user_type->value,
                    'name' => $participant->user?->name,
                    'last_read_at' => $participant->last_read_at?->toIso8601String(),
                ])->values()->all(),
                'last_message' => $lastMessage ? $this->formatMessage($lastMessage) : null,
                'unread_count' => (int) $unreadCount,
            ];
        })->values()->all();
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, array<string, mixed>>
     */
    public function chatMessages(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $chatId = (string) $args['chat_id'];
        $limit = max(1, min((int) ($args['limit'] ?? 50), 200));

        $participant = ChatParticipant::query()
            ->where('chat_id', $chatId)
            ->where('user_id', $user->id)
            ->first();

        if (! $participant) {
            throw new UserError('Not authorized to access this chat.');
        }

        $messages = $participant->chat
            ->messages()
            ->with('senderParticipant.user')
            ->orderByDesc('timestamp')
            ->limit($limit)
            ->get()
            ->reverse()
            ->values();

        return $messages->map(fn ($message): array => $this->formatMessage($message))->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function formatMessage($message): array
    {
        return [
            'id' => $message->id,
            'chat_id' => $message->chat_id,
            'sender_user_id' => $message->senderParticipant?->user_id,
            'sender_user_type' => $message->senderParticipant?->user_type?->value,
            'sender_name' => $message->senderParticipant?->user?->name,
            'content' => $message->content,
            'sent_at' => $message->timestamp?->toIso8601String(),
            'read_at' => $message->read_at?->toIso8601String(),
        ];
    }
}

