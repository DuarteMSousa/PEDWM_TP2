<?php

namespace App\Providers;

use App\Repositories\CartRepository\CartRepository;
use App\Repositories\CartRepository\CartRepositoryInterface;
use App\Repositories\ChainManagerRepository\ChainManagerRepository;
use App\Repositories\ChainManagerRepository\ChainManagerRepositoryInterface;
use App\Repositories\CouponRepository\CouponRepository;
use App\Repositories\CouponRepository\CouponRepositoryInterface;
use App\Repositories\CourierRepository\CourierRepository;
use App\Repositories\CourierRepository\CourierRepositoryInterface;
use App\Repositories\LocalManagerRepository\LocalManagerRepository;
use App\Repositories\LocalManagerRepository\LocalManagerRepositoryInterface;
use App\Repositories\OrderRepository\OrderRepository;
use App\Repositories\OrderRepository\OrderRepositoryInterface;
use App\Repositories\ProductRepository\ProductRepository;
use App\Repositories\ProductRepository\ProductRepositoryInterface;
use App\Repositories\PromotionItemRepository\PromotionItemRepository;
use App\Repositories\PromotionItemRepository\PromotionItemRepositoryInterface;
use App\Repositories\PromotionRepository\PromotionRepository;
use App\Repositories\PromotionRepository\PromotionRepositoryInterface;
use App\Repositories\RestaurantProductRepository\RestaurantProductRepository;
use App\Repositories\RestaurantProductRepository\RestaurantProductRepositoryInterface;
use App\Repositories\UserRepository\UserRepository;
use App\Repositories\UserRepository\UserRepositoryInterface;
use App\Repositories\ReviewRepository\ReviewRepository;
use App\Repositories\ReviewRepository\ReviewRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class AppRepositoryProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(CartRepositoryInterface::class, CartRepository::class);
        $this->app->bind(ChainManagerRepositoryInterface::class, ChainManagerRepository::class);
        $this->app->bind(CouponRepositoryInterface::class, CouponRepository::class);
        $this->app->bind(CourierRepositoryInterface::class, CourierRepository::class);
        $this->app->bind(LocalManagerRepositoryInterface::class, LocalManagerRepository::class);
        $this->app->bind(OrderRepositoryInterface::class, OrderRepository::class);
        $this->app->bind(ProductRepositoryInterface::class, ProductRepository::class);
        $this->app->bind(PromotionItemRepositoryInterface::class, PromotionItemRepository::class);
        $this->app->bind(PromotionRepositoryInterface::class, PromotionRepository::class);
        $this->app->bind(RestaurantProductRepositoryInterface::class, RestaurantProductRepository::class);
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(ReviewRepositoryInterface::class, ReviewRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
