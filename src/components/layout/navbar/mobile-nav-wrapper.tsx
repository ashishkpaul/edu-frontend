import {getRouteLocale} from '@/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getChannelToken} from '@/lib/vendure/channel';
import {getTopCollections} from '@/lib/vendure/cached';
import {MobileNav} from '@/components/layout/navbar/mobile-nav';

export async function MobileNavWrapper() {
    "use cache";
    cacheLife('days');

    const locale = await getRouteLocale();
    const channelToken = getChannelToken();
    cacheTag(`mobile-nav-${locale}-${channelToken}`);

    const collections = await getTopCollections(locale, channelToken);

    return <MobileNav collections={collections} />;
}
