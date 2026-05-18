<?php

namespace App\Services\CouponService;

use App\DTOs\Campaigns\Coupon\CreateCouponDTO;
use App\DTOs\Campaigns\Coupon\UpdateCouponDTO;
use App\Models\Coupon;

interface CouponServiceInterface
{
    public function getCouponsByChainId(string $chainId);

    public function getCouponByCode(string $code): ?Coupon;

    public function getCouponById(string $id): ?Coupon;

    public function createCoupon(CreateCouponDTO $data): Coupon;

    public function updateCoupon(string $id, UpdateCouponDTO $data): ?Coupon;

    public function deleteCoupon(string $id): bool;
}
