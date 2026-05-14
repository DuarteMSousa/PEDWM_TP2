<?php

namespace App\GraphQL\Mutations;

use App\Enums\NotificationType;
use App\Services\NotificationService\NotificationServiceInterface;
use App\Support\ResolvesAuthenticatedUser;
use Carbon\Carbon;

class PublishUserNotification
{
    use ResolvesAuthenticatedUser;

    public function __construct(private NotificationServiceInterface $notificationService)
    {
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function __invoke(null $_, array $args): array
    {
        $actor = $this->resolveAuthenticatedUser();

        $input = $args['input'];
        $notification = $this->notificationService->createAndDispatch(
            userId: $input['user_id'],
            type: NotificationType::from($input['type']),
            title: $input['title'],
            message: $input['message'],
            actorId: $actor->id
        );

        return [
            'ok' => true,
            'notification_id' => $notification->id,
            'sent_at' => Carbon::parse($notification->sent_at)->format('Y-m-d H:i:s'),
        ];
    }
}
