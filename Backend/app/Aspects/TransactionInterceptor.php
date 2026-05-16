<?php

namespace App\Aspects;

use Illuminate\Support\Facades\DB;
use Ray\Aop\MethodInterceptor;
use Ray\Aop\MethodInvocation;

class TransactionInterceptor implements MethodInterceptor
{
    public function invoke(MethodInvocation $invocation): mixed
    {
        $transactional = $this->transactionalAttribute($invocation) ?? new Transactional;
        $connection = $transactional->connection !== null
            ? DB::connection($transactional->connection)
            : DB::connection();

        return $connection->transaction(
            fn () => $invocation->proceed(),
            $transactional->attempts
        );
    }

    private function transactionalAttribute(MethodInvocation $invocation): ?Transactional
    {
        return $invocation->getMethod()->getAnnotation(Transactional::class);
    }
}
