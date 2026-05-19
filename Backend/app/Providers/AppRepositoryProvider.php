<?php

namespace App\Providers;

use App\Repositories\CartRepository\CartRepository;
use App\Repositories\CartRepository\CartRepositoryInterface;
use App\Repositories\CategoryRepository\CategoryRepository;
use App\Repositories\CategoryRepository\CategoryRepositoryInterface;
use App\Repositories\ChainManagerRepository\ChainManagerRepository;
use App\Repositories\ChainManagerRepository\ChainManagerRepositoryInterface;
use App\Repositories\CouponRepository\CouponRepository;
use App\Repositories\CouponRepository\CouponRepositoryInterface;
use App\Repositories\DeliveryOfferRepository\DeliveryOfferRepository;
use App\Repositories\DeliveryOfferRepository\DeliveryOfferRepositoryInterface;
use App\Repositories\DeliveryRepository\DeliveryRepository;
use App\Repositories\DeliveryRepository\DeliveryRepositoryInterface;
use App\Repositories\CourierRepository\CourierRepository;
use App\Repositories\CourierRepository\CourierRepositoryInterface;
use App\Repositories\LocalManagerRepository\LocalManagerRepository;
use App\Repositories\LocalManagerRepository\LocalManagerRepositoryInterface;
use App\Repositories\NotificationRepository\NotificationRepository;
use App\Repositories\NotificationRepository\NotificationRepositoryInterface;
use App\Repositories\OrderRepository\OrderRepository;
use App\Repositories\OrderRepository\OrderRepositoryInterface;
use App\Repositories\OutboxRepository\OutboxRepository;
use App\Repositories\OutboxRepository\OutboxRepositoryInterface;
use App\Repositories\PaymentRepository\PaymentRepository;
use App\Repositories\PaymentRepository\PaymentRepositoryInterface;
use App\Repositories\ProductRepository\ProductRepository;
use App\Repositories\ProductRepository\ProductRepositoryInterface;
use App\Repositories\PromotionItemRepository\PromotionItemRepository;
use App\Repositories\PromotionItemRepository\PromotionItemRepositoryInterface;
use App\Repositories\PromotionRepository\PromotionRepository;
use App\Repositories\PromotionRepository\PromotionRepositoryInterface;
use App\Repositories\RestaurantProductRepository\RestaurantProductRepository;
use App\Repositories\RestaurantProductRepository\RestaurantProductRepositoryInterface;
use App\Repositories\RestaurantRepository\RestaurantRepository;
use App\Repositories\RestaurantRepository\RestaurantRepositoryInterface;
use App\Repositories\RestaurantChainRepository\RestaurantChainRepository;
use App\Repositories\RestaurantChainRepository\RestaurantChainRepositoryInterface;
use App\Repositories\UserRepository\UserRepository;
use App\Repositories\UserRepository\UserRepositoryInterface;
use App\Repositories\UserPushTokenRepository\UserPushTokenRepository;
use App\Repositories\UserPushTokenRepository\UserPushTokenRepositoryInterface;
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
        $this->app->bind(CategoryRepositoryInterface::class, CategoryRepository::class);
        $this->app->bind(ChainManagerRepositoryInterface::class, ChainManagerRepository::class);
        $this->app->bind(CouponRepositoryInterface::class, CouponRepository::class);
        $this->app->bind(DeliveryOfferRepositoryInterface::class, DeliveryOfferRepository::class);
        $this->app->bind(DeliveryRepositoryInterface::class, DeliveryRepository::class);
        $this->app->bind(CourierRepositoryInterface::class, CourierRepository::class);
        $this->app->bind(LocalManagerRepositoryInterface::class, LocalManagerRepository::class);
        $this->app->bind(NotificationRepositoryInterface::class, NotificationRepository::class);
        $this->app->bind(OrderRepositoryInterface::class, OrderRepository::class);
        $this->app->bind(OutboxRepositoryInterface::class, OutboxRepository::class);
        $this->app->bind(PaymentRepositoryInterface::class, PaymentRepository::class);
        $this->app->bind(ProductRepositoryInterface::class, ProductRepository::class);
        $this->app->bind(PromotionItemRepositoryInterface::class, PromotionItemRepository::class);
        $this->app->bind(PromotionRepositoryInterface::class, PromotionRepository::class);
        $this->app->bind(RestaurantChainRepositoryInterface::class, RestaurantChainRepository::class);
        $this->app->bind(RestaurantRepositoryInterface::class, RestaurantRepository::class);
        $this->app->bind(RestaurantProductRepositoryInterface::class, RestaurantProductRepository::class);
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(UserPushTokenRepositoryInterface::class, UserPushTokenRepository::class);
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
