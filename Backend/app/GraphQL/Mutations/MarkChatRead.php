<?php

namespace App\GraphQL\Mutations;

use App\Models\ChatParticipant;
use App\Support\ResolvesAuthenticatedUser;
use GraphQL\Error\UserError;

class MarkChatRead
{
    use ResolvesAuthenticatedUser;

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $chatId = (string) $args['input']['chat_id'];
        $readAt = now();

        $participant = ChatParticipant::query()
            ->where('chat_id', $chatId)
            ->where('user_id', $user->id)
            ->first();

        if (! $participant) {
            throw new UserError('Not authorized to update this chat.');
        }

        $participant->update(['last_read_at' => $readAt]);

        return [
            'ok' => true,
            'chat_id' => $chatId,
            'read_at' => $readAt->toIso8601String(),
        ];
    }
}

