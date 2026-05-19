<?php

namespace App\Providers;

use App\Events\NotificationEventRecorded;
use App\Enums\PromotionItemParentType;
use App\Listeners\CreateNotificationFromDomainEvent;
use App\Models\Coupon;
use App\Models\Promotion;
use App\Services\CartService\CartService;
use App\Services\CartService\CartServiceInterface;
use App\Services\CategoryService\CategoryService;
use App\Services\CategoryService\CategoryServiceInterface;
use App\Services\ChatService\ChatService;
use App\Services\ChatService\ChatServiceInterface;
use App\Services\CouponService\CouponService;
use App\Services\CouponService\CouponServiceInterface;
use App\Services\CourierService\CourierService;
use App\Services\CourierService\CourierServiceInterface;
use App\Services\DeliveryService\DeliveryService;
use App\Services\DeliveryService\DeliveryServiceInterface;
use App\Services\NotificationFeedService\NotificationFeedService;
use App\Services\NotificationFeedService\NotificationFeedServiceInterface;
use App\Services\NotificationService\NotificationService;
use App\Services\NotificationService\NotificationServiceInterface;
use App\Services\OrderService\OrderService;
use App\Services\OrderService\OrderServiceInterface;
use App\Services\PaymentService\PaymentService;
use App\Services\PaymentService\PaymentServiceInterface;
use App\Services\ProductService\ProductService;
use App\Services\ProductService\ProductServiceInterface;
use App\Services\PromotionService\PromotionService;
use App\Services\PromotionService\PromotionServiceInterface;
use App\Services\RestaurantChainService\RestaurantChainService;
use App\Services\RestaurantChainService\RestaurantChainServiceInterface;
use App\Services\RestaurantProductService\RestaurantProductService;
use App\Services\RestaurantProductService\RestaurantProductServiceInterface;
use App\Services\RestaurantService\RestaurantService;
use App\Services\RestaurantService\RestaurantServiceInterface;
use App\Services\ReviewService\ReviewService;
use App\Services\ReviewService\ReviewServiceInterface;
use App\Services\TrackingService\TrackingService;
use App\Services\TrackingService\TrackingServiceInterface;
use App\Services\UserAddressService\UserAddressService;
use App\Services\UserAddressService\UserAddressServiceInterface;
use App\Services\UserService\UserService;
use App\Services\UserService\UserServiceInterface;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(CartServiceInterface::class, CartService::class);
        $this->app->bind(CategoryServiceInterface::class, CategoryService::class);
        $this->app->bind(ChatServiceInterface::class, ChatService::class);
        $this->app->bind(CouponServiceInterface::class, CouponService::class);
        $this->app->bind(CourierServiceInterface::class, CourierService::class);
        $this->app->bind(DeliveryServiceInterface::class, DeliveryService::class);
        $this->app->bind(NotificationFeedServiceInterface::class, NotificationFeedService::class);
        $this->app->bind(NotificationServiceInterface::class, NotificationService::class);
        $this->app->bind(OrderServiceInterface::class, OrderService::class);
        $this->app->bind(PaymentServiceInterface::class, PaymentService::class);
        $this->app->bind(ProductServiceInterface::class, ProductService::class);
        $this->app->bind(PromotionServiceInterface::class, PromotionService::class);
        $this->app->bind(RestaurantChainServiceInterface::class, RestaurantChainService::class);
        $this->app->bind(RestaurantProductServiceInterface::class, RestaurantProductService::class);
        $this->app->bind(RestaurantServiceInterface::class, RestaurantService::class);
        $this->app->bind(ReviewServiceInterface::class, ReviewService::class);
        $this->app->bind(TrackingServiceInterface::class, TrackingService::class);
        $this->app->bind(UserAddressServiceInterface::class, UserAddressService::class);
        $this->app->bind(UserServiceInterface::class, UserService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Relation::morphMap([
            PromotionItemParentType::COUPON->value => Coupon::class,
            PromotionItemParentType::PROMOTION->value => Promotion::class,
        ]);

        Event::listen(NotificationEventRecorded::class, CreateNotificationFromDomainEvent::class);
    }
}
