<?php

namespace App\Models;

use App\Enums\CampaignMorphType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PromotionItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'parent_type',
        'parent_id',
        'item_id',
    ];

    protected function casts(): array
    {
        return [
            'parent_type' => CampaignMorphType::class,
        ];
    }

    public function parent(): MorphTo
    {
        return $this->morphTo();
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'item_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'item_id');
    }
}
