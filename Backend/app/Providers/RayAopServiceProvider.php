<?php

namespace App\Providers;

use App\Aspects\ErrorHandlingInterceptor;
use App\Aspects\LoggingInterceptor;
use App\Aspects\Transactional;
use App\Aspects\TransactionInterceptor;
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
use Illuminate\Contracts\Container\Container;
use Illuminate\Support\ServiceProvider;
use Ray\Aop\Aspect;
use Ray\Aop\Matcher;
use ReflectionClass;
use ReflectionNamedType;
use RuntimeException;

class RayAopServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    private array $services = [
        CartServiceInterface::class => CartService::class,
        CategoryServiceInterface::class => CategoryService::class,
        ChatServiceInterface::class => ChatService::class,
        CouponServiceInterface::class => CouponService::class,
        CourierServiceInterface::class => CourierService::class,
        DeliveryServiceInterface::class => DeliveryService::class,
        NotificationFeedServiceInterface::class => NotificationFeedService::class,
        NotificationServiceInterface::class => NotificationService::class,
        OrderServiceInterface::class => OrderService::class,
        PaymentServiceInterface::class => PaymentService::class,
        ProductServiceInterface::class => ProductService::class,
        PromotionServiceInterface::class => PromotionService::class,
        RestaurantChainServiceInterface::class => RestaurantChainService::class,
        RestaurantProductServiceInterface::class => RestaurantProductService::class,
        RestaurantServiceInterface::class => RestaurantService::class,
        ReviewServiceInterface::class => ReviewService::class,
        TrackingServiceInterface::class => TrackingService::class,
        UserAddressServiceInterface::class => UserAddressService::class,
        UserServiceInterface::class => UserService::class,
    ];

    public function register(): void
    {
        if (! config('ray_aop.enabled')) {
            return;
        }

        $this->ensureCacheDirectory();

        $this->app->singleton(Aspect::class, function (): Aspect {
            $aspect = new Aspect(config('ray_aop.cache_dir'));
            $aspect->bind(
                (new Matcher)->any(),
                (new Matcher)->annotatedWith(Transactional::class),
                [
                    new TransactionInterceptor,
                ]
            );

            $aspect->bind(
                (new Matcher)->any(),
                (new Matcher)->any(),
                [
                    new ErrorHandlingInterceptor,
                    new LoggingInterceptor,
                ]
            );

            return $aspect;
        });

        foreach ($this->services as $interface => $concrete) {
            $this->bindProxied($interface, $concrete);
            $this->bindProxied($concrete, $concrete);
        }
    }

    /**
     * @param  class-string  $abstract
     * @param  class-string  $concrete
     */
    private function bindProxied(string $abstract, string $concrete): void
    {
        $this->app->bind($abstract, function (Container $app) use ($concrete): object {
            return $app->make(Aspect::class)->newInstance(
                $concrete,
                $this->constructorArguments($app, $concrete)
            );
        });
    }

    /**
     * @param  class-string  $concrete
     * @return array<int, mixed>
     */
    private function constructorArguments(Container $app, string $concrete): array
    {
        $constructor = (new ReflectionClass($concrete))->getConstructor();

        if ($constructor === null) {
            return [];
        }

        $arguments = [];

        foreach ($constructor->getParameters() as $parameter) {
            $type = $parameter->getType();

            if ($type instanceof ReflectionNamedType && ! $type->isBuiltin()) {
                $arguments[] = $app->make($type->getName());

                continue;
            }

            if ($parameter->isDefaultValueAvailable()) {
                $arguments[] = $parameter->getDefaultValue();

                continue;
            }

            if ($parameter->allowsNull()) {
                $arguments[] = null;

                continue;
            }

            throw new RuntimeException("Cannot resolve constructor parameter {$parameter->getName()} for {$concrete}.");
        }

        return $arguments;
    }

    private function ensureCacheDirectory(): void
    {
        $cacheDir = config('ray_aop.cache_dir');

        if (! is_dir($cacheDir)) {
            mkdir($cacheDir, 0775, true);
        }
    }
}
