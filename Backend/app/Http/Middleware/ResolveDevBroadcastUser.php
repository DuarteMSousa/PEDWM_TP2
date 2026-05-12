<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ResolveDevBroadcastUser
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (
            app()->environment(['local', 'testing']) &&
            ! Auth::check() &&
            $request->hasHeader('X-Dev-User-Id')
        ) {
            Auth::onceUsingId($request->header('X-Dev-User-Id'));
        }

        return $next($request);
    }
}
