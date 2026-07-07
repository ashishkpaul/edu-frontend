import { graphql } from '@/graphql';

export const ProductCardFragment = graphql(`
    fragment ProductCard on SearchResult {
        productId
        productName
        slug
        productAsset {
            id
            preview
        }
        priceWithTax {
            __typename
            ... on PriceRange {
                min
                max
            }
            ... on SinglePrice {
                value
            }
        }
        currencyCode
    }
`);

export const ActiveCustomerFragment = graphql(`
    fragment ActiveCustomer on Customer {
        id
        firstName
        lastName
        emailAddress
    }
`);

// ─── Saa9vi-specific fragments ──────────────────────────────────────────

export const TenantProfileFragment = graphql(`
    fragment TenantProfileFields on TenantProfile {
        id
        businessName
        tagline
        logoAsset {
            id
            preview
        }
        timezone
        contactEmail
        customDomain
        onboardingComplete
    }
`);

export const InstructorCardFragment = graphql(`
    fragment InstructorCardFields on InstructorProfile {
        id
        fullName
        slug
        bio
        photoAsset {
            id
            preview
        }
        credentials
        expertiseAreas
        displayOrder
    }
`);

export const SessionCardFragment = graphql(`
    fragment SessionCardFields on BbbScheduledSessionPublic {
        id
        title
        startTime
        endTime
        status
        trainerName
        isTrial
        visibility
        maxAttendees
        slug
        activeMeetingId
        joinUrl
    }
`);

export const ReviewFragment = graphql(`
    fragment ReviewFields on ProductReview {
        id
        summary
        body
        rating
        authorName
        createdAt
        userVote
        verifiedPurchase
        upvotes
        downvotes
        response
    }
`);

export const CmsBannerFragment = graphql(`
    fragment CmsBannerFields on Banner {
        id
        title
        image {
            id
            preview
        }
        linkUrl
        placement
    }
`);
