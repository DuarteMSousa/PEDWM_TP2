<?php

namespace App\Providers;

use App\Services\CommerceService\CommerceService;
use App\Services\CommerceService\CommerceServiceInterface;
use App\Services\CheckoutDiscountService\CheckoutDiscountService;
use App\Services\CheckoutDiscountService\CheckoutDiscountServiceInterface;
use App\Services\DeliveryOfferService\DeliveryOfferService;
use App\Services\DeliveryOfferService\DeliveryOfferServiceInterface;
use App\Services\NotificationService\NotificationService;
use App\Services\NotificationService\NotificationServiceInterface;
use App\Services\ProductService\ProductService;
use App\Services\ProductService\ProductServiceInterface;
use App\Services\UserService\UserService;
use App\Services\UserService\UserServiceInterface;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(CommerceServiceInterface::class, CommerceService::class);
        $this->app->bind(CheckoutDiscountServiceInterface::class, CheckoutDiscountService::class);
        $this->app->bind(DeliveryOfferServiceInterface::class, DeliveryOfferService::class);
        $this->app->bind(NotificationServiceInterface::class, NotificationService::class);
        $this->app->bind(ProductServiceInterface::class, ProductService::class);
        $this->app->bind(UserServiceInterface::class, UserService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
