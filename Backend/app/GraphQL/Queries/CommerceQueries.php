<?php

namespace App\GraphQL\Queries;

use App\Models\User;
use App\Services\CommerceService\CommerceServiceInterface;
use Illuminate\Auth\AuthenticationException;

class CommerceQueries
{
    public function __construct(private CommerceServiceInterface $commerceService)
    {
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, array<string, mixed>>
     */
    public function restaurants(null $_, array $args): array
    {
        return $this->commerceService->listRestaurants($args);
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, array<string, mixed>>
     */
    public function restaurantMenu(null $_, array $args): array
    {
        return $this->commerceService->getRestaurantMenu($args['restaurant_id']);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function myCart(null $_, array $args): ?array
    {
        $user = $this->resolveAuthenticatedUser();

        return $this->commerceService->getUserCart($user->id);
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, array<string, mixed>>
     */
    public function myOrders(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $limit = max(1, min((int) ($args['limit'] ?? 20), 100));
        $activeOnly = (bool) ($args['active_only'] ?? false);

        return $this->commerceService->listUserOrders($user->id, $limit, $activeOnly);
    }

    private function resolveAuthenticatedUser(): User
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

        return $user;
    }

}
