<?php

namespace App\GraphQL\Mutations;

use App\Models\Chat;
use App\Models\ChatParticipant;
use App\Models\Message;
use App\Services\OutboxService;
use App\Support\ResolvesAuthenticatedUser;
use Carbon\Carbon;
use GraphQL\Error\UserError;
use Illuminate\Support\Str;

class SendChatMessage
{
    use ResolvesAuthenticatedUser;

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        $input = $args['input'];
        $content = trim((string) $input['content']);
        if ($content === '') {
            throw new UserError('Message content cannot be empty.');
        }

        /** @var Chat|null $chat */
        $chat = Chat::query()->whereKey($input['chat_id'])->first();

        if (! $chat) {
            throw new UserError('Chat not found.');
        }

        /** @var ChatParticipant|null $participant */
        $participant = ChatParticipant::query()
            ->where('chat_id', $chat->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $participant) {
            throw new UserError('User is not a participant in this chat.');
        }

        $timestamp = Carbon::now();

        $message = Message::query()->create([
            'chat_id' => $chat->id,
            'sender_participant_id' => $participant->id,
            'content' => $content,
            'timestamp' => $timestamp,
        ]);

        $payload = [
            'eventId' => (string) Str::uuid(),
            'eventName' => 'CHAT_MESSAGE_SENT',
            'chatId' => $chat->id,
            'messageId' => $message->id,
            'senderUserId' => $user->id,
            'senderType' => $participant->user_type->value,
            'content' => $message->content,
            'timestamp' => $timestamp->toIso8601String(),
        ];

        app(OutboxService::class)->enqueue(
            aggregateType: 'chat',
            aggregateId: $chat->id,
            eventName: 'CHAT_MESSAGE_SENT',
            payload: $payload
        );

        return [
            'ok' => true,
            'chat_id' => $chat->id,
            'message_id' => $message->id,
            'sent_at' => $timestamp->format('Y-m-d H:i:s'),
        ];
    }
}
