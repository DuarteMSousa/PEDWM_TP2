<?php

namespace App\GraphQL\Mutations;

use App\Events\ChatMessageSent;
use App\Models\Chat;
use App\Models\ChatParticipant;
use App\Models\Message;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Str;
use RuntimeException;

class SendChatMessage
{
    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $user = auth()->user();

        if (! $user && app()->environment(['local', 'testing'])) {
            $devUserId = request()->header('X-Dev-User-Id');
            if ($devUserId) {
                $user = User::query()->find($devUserId);
            }
        }

        if (! $user) {
            throw new AuthenticationException('Authentication required.');
        }

        $input = $args['input'];

        /** @var Chat|null $chat */
        $chat = Chat::query()->whereKey($input['chat_id'])->first();

        if (! $chat) {
            throw new RuntimeException('Chat not found.');
        }

        /** @var ChatParticipant|null $participant */
        $participant = ChatParticipant::query()
            ->where('chat_id', $chat->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $participant) {
            throw new RuntimeException('User is not a participant in this chat.');
        }

        $timestamp = Carbon::now();

        $message = Message::query()->create([
            'chat_id' => $chat->id,
            'sender_participant_id' => $participant->id,
            'content' => trim($input['content']),
            'timestamp' => $timestamp,
        ]);

        $payload = [
            'eventId' => (string) Str::uuid(),
            'eventName' => 'CHAT_MESSAGE_SENT',
            'chatId' => $chat->id,
            'messageId' => $message->id,
            'senderUserId' => $user->id,
            'senderType' => $participant->user_type,
            'content' => $message->content,
            'timestamp' => $timestamp->toIso8601String(),
        ];

        event(new ChatMessageSent($payload));

        return [
            'ok' => true,
            'chat_id' => $chat->id,
            'message_id' => $message->id,
            'sent_at' => $timestamp->format('Y-m-d H:i:s'),
        ];
    }
}
