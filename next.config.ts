import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
    cacheComponents: true,
    images: {
        dangerouslyAllowLocalIP: true,
        remotePatterns: [
            { hostname: 'readonlydemo.vendure.io' },
            { hostname: 'demo.vendure.io' },
            { hostname: 'localhost' }
        ],
    },
    // 1. Move it here (Root level of the config object)
    allowedDevOrigins: ['storefront.meeting.lan'], 
    
    experimental: {
        rootParams: true
    }
};

export default withNextIntl(nextConfig);
