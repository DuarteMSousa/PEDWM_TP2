<?php

namespace App\Repositories\CouponRepository;

use App\DTOs\Campaigns\Coupon\CreateCouponDTO;
use App\DTOs\Campaigns\Coupon\UpdateCouponDTO;
use App\Models\Coupon;

class CouponRepository implements CouponRepositoryInterface
{
    public function findById(string $id)
    {
        return Coupon::with('promotionItems')->find($id);
    }

    public function findByCode(string $code)
    {
        return Coupon::with('promotionItems')->where('code', $code)->first();
    }

    public function findByChainId(string $chainId)
    {
        return Coupon::with('promotionItems')->where('chain_id', $chainId)->get();
    }

    public function createCoupon(CreateCouponDTO $data)
    {
        return Coupon::create([
            'chain_id' => $data->chain_id,
            'code' => $data->code,
            'description' => $data->description,
            'type' => $data->type->value,
            'target' => $data->target->value,
            'expiry_date' => $data->expiry_date,
            'discount' => $data->discount,
        ]);
    }

    public function updateCoupon(string $id, UpdateCouponDTO $data)
    {
        $coupon = Coupon::find($id);

        if (!$coupon) {
            return null;
        }

        $coupon->update(array_filter([
            'code' => $data->code,
            'description' => $data->description,
            'type' => $data->type?->value,
            'target' => $data->target?->value,
            'expiry_date' => $data->expiry_date,
            'discount' => $data->discount,
        ], static fn ($value) => $value !== null));

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
