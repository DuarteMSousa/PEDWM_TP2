<?php

namespace App\DTOs\Restaurant;

class SearchRestaurantsDTO
{
    public function __construct(
        public readonly string $q = '',
        public readonly string $name = '',
        public readonly string $chainName = '',
        public readonly string $city = '',
        public readonly string $country = '',
        public readonly string $postalCode = '',
        public readonly int $pageNumber = 1,
        public readonly int $pageSize = 20,
    ) {
    }

    public static function fromArray(array $filters): self
    {
        $pageNumber = (int) ($filters['page_number'] ?? $filters['page'] ?? 1);
        if ($pageNumber < 1) {
            $pageNumber = 1;
        }

        $pageSize = (int) ($filters['page_size'] ?? $filters['per_page'] ?? 20);
        if ($pageSize < 1) {
            $pageSize = 20;
        }
        if ($pageSize > 100) {
            $pageSize = 100;
        }

        return new self(
            q: trim((string) ($filters['q'] ?? '')),
            name: trim((string) ($filters['name'] ?? '')),
            chainName: trim((string) ($filters['chain_name'] ?? '')),
            city: trim((string) ($filters['city'] ?? '')),
            country: trim((string) ($filters['country'] ?? '')),
            postalCode: trim((string) ($filters['postal_code'] ?? '')),
            pageNumber: $pageNumber,
            pageSize: $pageSize,
        );
    }

    public function toArray(): array
    {
        return [
            'q' => $this->q,
            'name' => $this->name,
            'chain_name' => $this->chainName,
            'city' => $this->city,
            'country' => $this->country,
            'postal_code' => $this->postalCode,
            'page_number' => $this->pageNumber,
            'page_size' => $this->pageSize,
        ];
    }
}