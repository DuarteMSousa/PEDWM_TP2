<?php

namespace App\Repositories\ChainManagerRepository;

use App\DTOs\ChainManager\CreateChainManagerDTO;

interface ChainManagerRepositoryInterface
{
    public function findByUserId(string $userId);

    public function findByChainId(string $chainId);

    public function createChainManager(CreateChainManagerDTO $data);

    public function deleteChainManager(string $userId);
}
