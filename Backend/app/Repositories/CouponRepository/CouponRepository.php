<?php

namespace App\Repositories\CouponRepository;

use App\DTOs\Campaigns\Coupon\CreateCouponDTO;
use App\DTOs\Campaigns\Coupon\UpdateCouponDTO;
use App\Models\Coupon;

class CouponRepository implements CouponRepositoryInterface
{
    public function findById(string $id)
    {
        return Coupon::find($id);
    }

    public function findByCode(string $code)
    {
        return Coupon::where('code', $code)->first();
    }

    public function findByChainId(string $chainId)
    {
        return Coupon::where('chain_id', $chainId)->get();
    }

    public function createCoupon(CreateCouponDTO $data)
    {
        return Coupon::create($data->toArray());
    }

    public function updateCoupon(string $id, UpdateCouponDTO $data)
    {
        $coupon = Coupon::find($id);

        if (!$coupon) {
            return null;
        }

        $coupon->update($data->toArray());

        return $coupon;
    }

    public function deleteCoupon(string $id)
    {
        $coupon = Coupon::find($id);

        if (!$coupon) {
            return false;
        }

        $coupon->delete();

        return true;
    }
}
