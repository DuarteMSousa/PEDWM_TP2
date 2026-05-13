<?php

namespace App\DTOs\ChainManager;

use Spatie\LaravelData\Data;

class CreateChainManagerDTO extends Data
{
    public function __construct(
        public readonly string $user_id,
        public readonly string $chain_id,
    ) {
    }
}
