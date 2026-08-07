import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/metadata';
import RegisterAcademyClient from './register-academy-client';

export const metadata: Metadata = {
    title: `Start Your Academy — ${SITE_NAME}`,
    description: `Create your own academy on the ${SITE_NAME} platform. Set up your storefront, admin account, and start selling courses in minutes.`,
};

export default function RegisterAcademyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-3xl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold">Start Your Academy</h1>
                <p className="text-muted-foreground mt-2">
                    Create your own academy on the Saa9vi platform in minutes.
                </p>
            </div>
            <RegisterAcademyClient />
        </div>
    );
}
