<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Campaigns\Coupon\CreateCouponDTO;
use App\DTOs\Campaigns\Coupon\UpdateCouponDTO;
use App\DTOs\Campaigns\Promotion\CreatePromotionDTO;
use App\DTOs\Campaigns\Promotion\UpdatePromotionDTO;
use App\Services\CouponService\CouponServiceInterface;
use App\Services\PromotionService\PromotionServiceInterface;

class CampaignMutations
{
    public function __construct(
        private PromotionServiceInterface $promotionService,
        private CouponServiceInterface $couponService,
    ) {
    }

    public function createPromotion($_, array $args)
    {
        return $this->promotionService->createPromotion(
            actorUserId: $args['actor_user_id'],
            data: CreatePromotionDTO::from($args['input']),
        );
    }

    public function updatePromotion($_, array $args)
    {
        return $this->promotionService->updatePromotion(
            actorUserId: $args['actor_user_id'],
            promotionId: $args['id'],
            data: UpdatePromotionDTO::from($args['input']),
        );
    }

    public function deletePromotion($_, array $args): bool { return $this->promotionService->deletePromotion($args['actor_user_id'], $args['id']); }

    public function createCoupon($_, array $args) { return $this->couponService->createCoupon(CreateCouponDTO::from($args['input'])); }
    public function updateCoupon($_, array $args) { return $this->couponService->updateCoupon($args['id'], UpdateCouponDTO::from($args['input'])); }
    public function deleteCoupon($_, array $args): bool { return $this->couponService->delete($args['id']); }
}
