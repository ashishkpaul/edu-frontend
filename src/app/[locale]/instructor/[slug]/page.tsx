import { query } from '@/lib/vendure/api';
import { graphql } from '@/graphql';
import { getRouteLocale } from '@/i18n/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';

interface Props {
    params: Promise<{ slug: string }>;
}

const GetInstructorProfileQuery = graphql(`
    query GetInstructorProfile($slug: String!) {
        instructorProfile(slug: $slug) {
            id
            fullName
            bio
            photoAsset {
                id
                preview
            }
            credentials
            expertiseAreas
        }
    }
`);

export default async function InstructorProfilePage({ params }: Props) {
    const { slug } = await params;
    const locale = await getRouteLocale();

    const { data } = await query(GetInstructorProfileQuery, { slug }, { languageCode: locale });

    if (!data.instructorProfile) {
        notFound();
    }

    const instructor = data.instructorProfile;

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {instructor.photoAsset && (
                        <div className="relative w-48 h-48 rounded-full overflow-hidden shrink-0">
                            <Image
                                src={instructor.photoAsset.preview}
                                alt={instructor.fullName}
                                fill
                                className="object-cover"
                                sizes="192px"
                            />
                        </div>
                    )}
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold">{instructor.fullName}</h1>
                        {instructor.credentials && (
                            <p className="text-muted-foreground mt-1">{instructor.credentials}</p>
                        )}
                        {instructor.expertiseAreas && instructor.expertiseAreas.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {instructor.expertiseAreas.map((area: string) => (
                                    <span
                                        key={area}
                                        className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                                    >
                                        {area}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bio */}
                {instructor.bio && (
                    <div className="mt-8 prose prose-lg max-w-none">
                        <p>{instructor.bio}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
