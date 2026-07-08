import {getRouteLocale} from '@/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getChannelToken} from '@/lib/vendure/channel';
import {getChannelTokenFromHeaders} from '@/lib/vendure/api';
import {getTopCollections} from '@/lib/vendure/cached';
import {MobileNav} from '@/components/layout/navbar/mobile-nav';

async function MobileNavWrapperInner(channelToken: string) {
    "use cache";
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`mobile-nav-${locale}-${channelToken}`);

    const collections = await getTopCollections(locale, channelToken);

    return <MobileNav collections={collections} />;
}

export async function MobileNavWrapper() {
    const channelToken = (await getChannelTokenFromHeaders()) || getChannelToken();
    return MobileNavWrapperInner(channelToken);
}
