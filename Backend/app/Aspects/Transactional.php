<?php

namespace App\Aspects;

use Attribute;

#[Attribute(Attribute::TARGET_METHOD)]
class Transactional
{
    public function __construct(
        public readonly ?string $connection = null,
        public readonly int $attempts = 1,
    ) {}
}
