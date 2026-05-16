<?php

use App\Providers\AppRepositoryProvider;
use App\Providers\AppServiceProvider;
use App\Providers\RayAopServiceProvider;

return [
    AppRepositoryProvider::class,
    AppServiceProvider::class,
    RayAopServiceProvider::class,
];
