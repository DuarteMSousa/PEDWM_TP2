<?php

namespace App\GraphQL\Queries;

use App\Services\CouponService\CouponServiceInterface;
use App\Services\PromotionService\PromotionServiceInterface;

class CampaignQueries
{
    public function __construct(
        private PromotionServiceInterface $promotionService,
        private CouponServiceInterface $couponService,
    ) {}

    public function getPromotionsByChainId($_, array $args)
    {
        return $this->promotionService->getPromotionsByChainId($args['chain_id']);
    }

    public function getPromotionById($_, array $args)
    {
        return $this->promotionService->getPromotionById($args['id']);
    }

    public function getCouponsByChainId($_, array $args)
    {
        return $this->couponService->getCouponsByChainId($args['chain_id']);
    }

    public function getCouponById($_, array $args)
    {
        return $this->couponService->getCouponById($args['id']);
    }

    public function getCouponByCode($_, array $args)
    {
        return $this->couponService->getCouponByCode($args['code']);
    }
}
