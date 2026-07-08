/**
 * Resolves the current request's Host header to a Vendure channel token
 * via a subrequest to the storefront's own /api/resolve-channel route,
 * then hands the request off to the @storefront location with the
 * result available as $channel_token.
 *
 * SECURITY NOTE: $channel_token is set unconditionally below — to the
 * real token, or to '' when there's no match/the lookup failed. The
 * @storefront location in turn does proxy_set_header X-Saa9vi-Channel-Token
 * $channel_token unconditionally too. That combination is what strips
 * any client-supplied version of the header on every request, including
 * the failure path — there's no branch where a client value survives.
 * Don't special-case the empty-token branch to "just skip proxy_set_header";
 * that reopens exactly the spoofing gap this whole setup exists to close.
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
            var token = '';
            if (reply.status == 200 && reply.headersOut) {
                // Header casing from upstream can vary; check the common
                // forms. Log reply.headersOut once during setup to confirm
                // which casing your Next.js/Node version actually sends.
                token =
                    reply.headersOut['X-Saa9vi-Channel-Token'] ||
                    reply.headersOut['x-saa9vi-channel-token'] ||
                    '';
            }
            r.variables.channel_token = token;
            r.internalRedirect('@storefront');
        },
    );
}

export default { resolveChannel };
