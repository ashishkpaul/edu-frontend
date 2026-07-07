import {query} from './api';
import {GetActiveChannelQuery, GetAvailableCountriesQuery, GetTopCollectionsQuery} from './queries';

const VENDURE_CHANNEL_TOKEN = process.env.VENDURE_CHANNEL_TOKEN || process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN || '__default_channel__';

/**
 * Get the active channel without caching.
 * Channel config is language-independent, so no locale parameter needed.
 */
export async function getActiveChannelCached(channelToken = VENDURE_CHANNEL_TOKEN) {
    const result = await query(GetActiveChannelQuery, undefined, {channelToken});
    return result.data.activeChannel;
}

/**
 * Get available countries without caching.
 * Country names are translatable, so locale is required.
 */
export async function getAvailableCountriesCached(locale: string, channelToken = VENDURE_CHANNEL_TOKEN) {
    const result = await query(GetAvailableCountriesQuery, undefined, {languageCode: locale, channelToken});
    return result.data.availableCountries || [];
}

/**
 * Get top-level collections without caching.
 * Collection names are translatable, so locale is required.
 */
export async function getTopCollections(locale: string, channelToken = VENDURE_CHANNEL_TOKEN) {
    const result = await query(GetTopCollectionsQuery, undefined, {languageCode: locale, channelToken});
    return result.data.collections.items;
}
