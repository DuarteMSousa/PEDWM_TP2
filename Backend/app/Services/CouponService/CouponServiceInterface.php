<?php

namespace App\Services\CouponService;

use App\DTOs\Campaigns\Coupon\CreateCouponDTO;
use App\DTOs\Campaigns\Coupon\UpdateCouponDTO;
use App\Models\Coupon;

interface CouponServiceInterface
{
    public function forChain(string $chainId);

    public function findByCode(string $code): ?Coupon;

    public function find(string $id): ?Coupon;

    public function createCoupon(CreateCouponDTO $data): Coupon;

    public function updateCoupon(string $id, UpdateCouponDTO $data): ?Coupon;

    public function delete(string $id): bool;
}
