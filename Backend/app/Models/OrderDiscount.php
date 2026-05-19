<?php

namespace App\Models;

use App\Enums\CampaignMorphType;
use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class OrderDiscount extends Model
{
    use HasUuids;

    protected $fillable = [
        'order_id',
        'name_snapshot',
        'description_snapshot',
        'discount_amount',
        'discount_type',
        'discount_target',
        'order_item_id',
        'origin_type',
        'origin_id',
    ];

    protected function casts(): array
    {
        return [
            'discount_amount' => 'float',
            'discount_type' => DiscountType::class,
            'discount_target' => DiscountTarget::class,
            'origin_type' => CampaignMorphType::class,
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function origin(): MorphTo
    {
        return $this->morphTo();
    }
}
