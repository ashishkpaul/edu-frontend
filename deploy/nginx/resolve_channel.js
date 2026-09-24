/**
 * Resolves the current request's Host header to a Vendure channel token
 * via a subrequest to the storefront's own /api/resolve-channel route,
 * then hands the request off to the @storefront location with the
 * result available as $channel_token.
 *
 * SECURITY NOTE (spoofing): $channel_token is set unconditionally below — to
 * the real token, or to '' when no tenant was resolved. The @storefront
 * location in turn does proxy_set_header X-Saa9vi-Channel-Token
 * $channel_token unconditionally too. That combination is what strips any
 * client-supplied version of the header on every request, including the
 * failure path — there's no branch where a client value survives.
 * Don't special-case the empty-token branch to "just skip proxy_set_header";
 * that reopens exactly the spoofing gap this whole setup exists to close.
 *
 * SECURITY NOTE (B-6, unknown hostname): the route answers 403 — not 200+'' —
 * when Redis is healthy but the public hostname has no mapping, and this file
 * propagates that 403 to the client. An unmapped tenant hostname therefore
 * never reaches Next.js and can't silently render the default channel's
 * storefront. Only a genuine Redis *outage* still resolves to 200+'' (fail
 * open, availability preserved) — see route.ts's contract block and
 * deploy/VERIFY.md §3.
 */
function resolveChannel(r) {
    var hostname = r.headersIn.host ? r.headersIn.host.split(':')[0] : '';

    if (!hostname) {
        r.variables.channel_token = '';
        r.internalRedirect('@storefront');
        return;
    }

    r.subrequest(
        '/_resolve_channel_internal',
        { args: 'hostname=' + hostname },
        function (reply) {
            if (reply.status == 200) {
                // Header casing from upstream can vary; check the common
                // forms. Log reply.headersOut once during setup to confirm
                // which casing your Next.js/Node version actually sends.
                var token = '';
                if (reply.headersOut) {
                    token =
                        reply.headersOut['X-Saa9vi-Channel-Token'] ||
                        reply.headersOut['x-saa9vi-channel-token'] ||
                        '';
                }
                r.variables.channel_token = token;
                r.internalRedirect('@storefront');
                return;
            }

            if (reply.status == 403) {
                // Denied by the route: Redis is healthy and this public
                // hostname has no mapping. Fail CLOSED — the request never
                // reaches Next.js, so it cannot fall back to the default
                // channel's content (B-6).
                r.return(403, 'Unknown academy hostname\n');
                return;
            }

            // Anything else means the resolution route itself failed (Next.js
            // down, subrequest timeout, unexpected status). Deny rather than
            // continue: continuing would proxy into the same failing upstream,
            // and the old ''-then-fallback path could silently serve the
            // default channel. Redis *outages* are NOT this case — the route
            // answers 200+'' for those, preserving VERIFY.md §3.
            r.return(reply.status >= 500 ? reply.status : 502, 'Channel resolution unavailable\n');
        },
    );
}

export default { resolveChannel };
