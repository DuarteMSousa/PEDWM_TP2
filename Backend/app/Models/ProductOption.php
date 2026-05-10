<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductOption extends Model
{
    use HasUuids;

    protected $fillable = [
        'option_group_id',
        'name',
        'extra_price',
        'default_option',
    ];

    protected function casts(): array
    {
        return [
            'extra_price' => 'float',
            'default_option' => 'boolean',
        ];
    }

    public function optionGroup(): BelongsTo
    {
        return $this->belongsTo(ProductOptionGroup::class, 'option_group_id');
    }
}
