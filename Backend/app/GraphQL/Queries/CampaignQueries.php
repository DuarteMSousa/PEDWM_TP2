<?php

namespace App\GraphQL\Queries;

use App\Services\CouponService\CouponServiceInterface;
use App\Services\PromotionService\PromotionServiceInterface;

class CampaignQueries
{
    public function __construct(
        private PromotionServiceInterface $promotionService,
        private CouponServiceInterface $couponService,
    ) {
    }

    public function chainPromotions($_, array $args)
    {
        return $this->promotionService->forChain($args['chain_id']);
    }

    public function promotion($_, array $args)
    {
        return $this->promotionService->find($args['id']);
    }

    public function chainCoupons($_, array $args)
    {
        return $this->couponService->forChain($args['chain_id']);
    }

    public function coupon($_, array $args)
    {
        return $this->couponService->find($args['id']);
    }

    public function couponByCode($_, array $args)
    {
        return $this->couponService->findByCode($args['code']);
    }
}
