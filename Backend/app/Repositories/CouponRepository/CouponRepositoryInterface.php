<?php

namespace App\Repositories\CouponRepository;

use App\DTOs\Campaigns\Coupon\CreateCouponDTO;
use App\DTOs\Campaigns\Coupon\UpdateCouponDTO;

interface CouponRepositoryInterface
{
    public function findById(string $id);

    public function findByCode(string $code);

    public function findByChainId(string $chainId);

    public function createCoupon(CreateCouponDTO $data);

    public function updateCoupon(string $id, UpdateCouponDTO $data);

    public function deleteCoupon(string $id);
}
