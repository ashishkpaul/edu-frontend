import {getRouteLocale} from '@/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getChannelToken} from '@/lib/vendure/channel';
import {getChannelTokenFromHeaders} from '@/lib/vendure/api';
import {getTopCollections} from '@/lib/vendure/cached';
import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
} from '@/components/ui/navigation-menu';
import {NavbarLink} from '@/components/layout/navbar/navbar-link';

async function NavbarCollectionsInner(channelToken: string) {
    "use cache";
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`navbar-collections-${locale}-${channelToken}`);

    const collections = await getTopCollections(locale, channelToken);

    return (
        <NavigationMenu>
            <NavigationMenuList>
                {collections.map((collection) => (
                    <NavigationMenuItem key={collection.slug}>
                        <NavbarLink href={`/collection/${collection.slug}`}>
                            {collection.name}
                        </NavbarLink>
                    </NavigationMenuItem>
                ))}
            </NavigationMenuList>
        </NavigationMenu>
    );
}

export async function NavbarCollections() {
    const channelToken = (await getChannelTokenFromHeaders()) || getChannelToken();
    return NavbarCollectionsInner(channelToken);
}
