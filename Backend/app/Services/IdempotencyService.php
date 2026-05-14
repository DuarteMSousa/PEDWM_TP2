<?php

namespace App\Services;

use App\Models\IdempotencyKey;
use App\Models\User;
use GraphQL\Error\UserError;
use Illuminate\Support\Arr;

class IdempotencyService
{
    /**
     * @param  array<string, mixed>  $requestPayload
     * @param  callable(): array<string, mixed>  $callback
     * @return array<string, mixed>
     */
    public function execute(User $user, string $operation, array $requestPayload, callable $callback): array
    {
        $idempotencyKey = request()->header('Idempotency-Key');

        if (! $idempotencyKey) {
            if (! app()->environment(['local', 'testing'])) {
                throw new UserError('Missing Idempotency-Key header.');
            }

            $idempotencyKey = hash('sha256', $user->id . '|' . $operation . '|' . json_encode($requestPayload));
        }

        $requestHash = hash('sha256', json_encode($requestPayload));

        /** @var IdempotencyKey|null $existing */
        $existing = IdempotencyKey::query()
            ->where('user_id', $user->id)
            ->where('operation', $operation)
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existing) {
            if ($existing->request_hash !== $requestHash) {
                throw new UserError('Idempotency-Key was already used with a different request payload.');
            }

            return (array) Arr::wrap($existing->response_json);
        }

        $response = $callback();

        IdempotencyKey::query()->create([
            'user_id' => $user->id,
            'operation' => $operation,
            'idempotency_key' => $idempotencyKey,
            'request_hash' => $requestHash,
            'response_json' => $response,
        ]);

        return $response;
    }
}
