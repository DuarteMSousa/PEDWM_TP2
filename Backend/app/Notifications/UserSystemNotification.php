<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserSystemNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(private array $payload)
    {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $title = (string) ($this->payload['title'] ?? 'Nova notificacao');
        $message = (string) ($this->payload['message'] ?? '');
        $type = (string) ($this->payload['type'] ?? 'SYSTEM');

        return (new MailMessage())
            ->subject("[FastBite] {$title}")
            ->greeting("Ola {$notifiable->name},")
            ->line($message)
            ->line("Tipo: {$type}")
            ->line('Esta mensagem foi enviada automaticamente pelo sistema FastBite.');
    }
}

