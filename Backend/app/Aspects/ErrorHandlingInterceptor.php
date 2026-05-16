<?php

namespace App\Aspects;

use Illuminate\Support\Facades\Log;
use Ray\Aop\MethodInterceptor;
use Ray\Aop\MethodInvocation;
use Throwable;

class ErrorHandlingInterceptor implements MethodInterceptor
{
    public function invoke(MethodInvocation $invocation): mixed
    {
        try {
            return $invocation->proceed();
        } catch (Throwable $exception) {
            Log::error('aop.method.exception', [
                'target' => $this->targetName($invocation),
                'method' => $invocation->getMethod()->getName(),
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }

    private function targetName(MethodInvocation $invocation): string
    {
        $target = $invocation->getThis();

        return is_object($target) ? $target::class : (string) $target;
    }
}
