'use server';

import {mutate} from '@/lib/vendure/api';
import {
    SetOrderShippingAddressMutation,
    SetOrderBillingAddressMutation,
    SetOrderShippingMethodMutation,
    AddPaymentToOrderMutation,
    CreateCustomerAddressMutation,
    CreateRazorpayCheckoutOrderMutation,
    TransitionOrderToStateMutation,
    SetCustomerForOrderMutation,
} from '@/lib/vendure/mutations';
import {revalidatePath, updateTag} from 'next/cache';
import {redirect} from '@/i18n/navigation';
import {getLocale} from 'next-intl/server';

interface AddressInput {
    fullName: string;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    province: string;
    postalCode: string;
    countryCode: string;
    phoneNumber: string;
    company?: string;
}

export async function setShippingAddress(
    shippingAddress: AddressInput,
    useSameForBilling: boolean
) {
    const shippingResult = await mutate(
        SetOrderShippingAddressMutation,
        {input: shippingAddress},
        {useAuthToken: true}
    );

    if (shippingResult.data.setOrderShippingAddress.__typename !== 'Order') {
        throw new Error('Failed to set shipping address');
    }

    if (useSameForBilling) {
        await mutate(
            SetOrderBillingAddressMutation,
            {input: shippingAddress},
            {useAuthToken: true}
        );
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

export async function setShippingMethod(shippingMethodId: string) {
    const result = await mutate(
        SetOrderShippingMethodMutation,
        {shippingMethodId: [shippingMethodId]},
        {useAuthToken: true}
    );

    if (result.data.setOrderShippingMethod.__typename !== 'Order') {
        throw new Error('Failed to set shipping method');
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

export async function createCustomerAddress(address: AddressInput) {
    const result = await mutate(
        CreateCustomerAddressMutation,
        {input: address},
        {useAuthToken: true}
    );

    if (!result.data.createCustomerAddress) {
        throw new Error('Failed to create customer address');
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
    return result.data.createCustomerAddress;
}

export async function transitionToArrangingPayment() {
    const result = await mutate(
        TransitionOrderToStateMutation,
        {state: 'ArrangingPayment'},
        {useAuthToken: true}
    );

    if (result.data.transitionOrderToState?.__typename === 'OrderStateTransitionError') {
        const errorResult = result.data.transitionOrderToState;
        throw new Error(
            `Failed to transition order state: ${errorResult.errorCode} - ${errorResult.message}`
        );
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

export type PlaceOrderResult =
    | { kind: 'placed'; orderCode: string }
    | {
          kind: 'coupon-removed';
          message: string;
          removedCouponCodes: string[];
          previousTotalWithTax: number;
          newTotalWithTax: number;
      }
    | { kind: 'error'; errorCode: string; message: string };

export interface RazorpayCheckoutOrderHandle {
    razorpayOrderId: string;
    amountMinor: number;
    currency: string;
    keyId: string;
}

export async function placeOrder(paymentMethodCode: string): Promise<PlaceOrderResult> {
    // First, transition the order to ArrangingPayment state
    await transitionToArrangingPayment();

    // Prepare metadata based on payment method
    const metadata: Record<string, unknown> = {};

    // For standard payment, include the required fields
    if (paymentMethodCode === 'standard-payment') {
        metadata.shouldDecline = false;
        metadata.shouldError = false;
        metadata.shouldErrorOnSettle = false;
    }

    // Razorpay one-time checkout carries no client metadata here: the browser
    // handshake (razorpay_order_id / payment_id / signature) is submitted by
    // settleRazorpayPayment AFTER Razorpay Checkout.js authorizes the payment.
    if (paymentMethodCode === 'razorpay') {
        return { kind: 'error', errorCode: 'RAZORPAY_HANDSHAKE_REQUIRED', message: 'Razorpay payments must go through the Razorpay checkout flow.' };
    }

    // Add payment to the order
    const result = await mutate(
        AddPaymentToOrderMutation,
        {
            input: {
                method: paymentMethodCode,
                metadata,
            },
        },
        { useAuthToken: true }
    );

    const payload = result.data.addPaymentToOrder;
    if (payload.__typename === 'Order') {
        const orderCode = payload.code;

        // Update the cart tag to immediately invalidate cached cart data
        updateTag('cart');
        updateTag('active-order');

        const locale = await getLocale();
        redirect({ href: `/order-confirmation/${orderCode}`, locale });
    }

    if (payload.__typename === 'CouponRemovedDuringCheckoutError') {
        const locale = await getLocale();
        revalidatePath(`/${locale}/checkout`);
        return {
            kind: 'coupon-removed',
            message: payload.message,
            removedCouponCodes: [...payload.removedCouponCodes],
            previousTotalWithTax: payload.previousTotalWithTax,
            newTotalWithTax: payload.newTotalWithTax,
        };
    }

    return {
        kind: 'error',
        errorCode: 'errorCode' in payload ? String(payload.errorCode) : 'UNKNOWN',
        message: 'message' in payload ? String(payload.message) : 'Failed to place order',
    };
}

export async function createRazorpayCheckoutOrderAction(): Promise<RazorpayCheckoutOrderHandle> {
    // Must run AFTER transitionToArrangingPayment so the backend order total is
    // final; the Razorpay order amount binds to that total server-side.
    await transitionToArrangingPayment();
    const result = await mutate(CreateRazorpayCheckoutOrderMutation, {}, { useAuthToken: true });
    const handle = result.data.createRazorpayCheckoutOrder;
    if (!handle?.razorpayOrderId) {
        throw new Error('Failed to create Razorpay checkout order');
    }
    return {
        razorpayOrderId: handle.razorpayOrderId,
        amountMinor: handle.amountMinor,
        currency: handle.currency,
        keyId: handle.keyId,
    };
}

export async function settleRazorpayPayment(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}): Promise<PlaceOrderResult> {
    const result = await mutate(
        AddPaymentToOrderMutation,
        {
            input: {
                method: 'razorpay',
                metadata: {
                    razorpay_order_id: input.razorpayOrderId,
                    razorpay_payment_id: input.razorpayPaymentId,
                    razorpay_signature: input.razorpaySignature,
                },
            },
        },
        { useAuthToken: true }
    );

    const payload = result.data.addPaymentToOrder;
    if (payload.__typename === 'Order') {
        const orderCode = payload.code;
        updateTag('cart');
        updateTag('active-order');
        const locale = await getLocale();
        redirect({ href: `/order-confirmation/${orderCode}`, locale });
    }

    if (payload.__typename === 'CouponRemovedDuringCheckoutError') {
        const locale = await getLocale();
        revalidatePath(`/${locale}/checkout`);
        return {
            kind: 'coupon-removed',
            message: payload.message,
            removedCouponCodes: [...payload.removedCouponCodes],
            previousTotalWithTax: payload.previousTotalWithTax,
            newTotalWithTax: payload.newTotalWithTax,
        };
    }

    return {
        kind: 'error',
        errorCode: 'errorCode' in payload ? String(payload.errorCode) : 'UNKNOWN',
        message: 'message' in payload ? String(payload.message) : 'Failed to place order',
    };
}

interface GuestCustomerInput {
    emailAddress: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
}

export type SetCustomerForOrderResult =
    | { success: true }
    | { success: false; errorCode: 'EMAIL_CONFLICT'; message: string }
    | { success: false; errorCode: 'GUEST_CHECKOUT_DISABLED'; message: string }
    | { success: false; errorCode: 'NO_ACTIVE_ORDER'; message: string }
    | { success: false; errorCode: 'UNKNOWN'; message: string };

export async function setCustomerForOrder(
    input: GuestCustomerInput
): Promise<SetCustomerForOrderResult> {
    const result = await mutate(
        SetCustomerForOrderMutation,
        { input },
        { useAuthToken: true }
    );

    const response = result.data.setCustomerForOrder;

    switch (response.__typename) {
        case 'Order': {
            const locale = await getLocale();
            revalidatePath(`/${locale}/checkout`);
            return { success: true };
        }
        case 'AlreadyLoggedInError':
            return { success: true };
        case 'EmailAddressConflictError':
            return { success: false, errorCode: 'EMAIL_CONFLICT', message: response.message };
        case 'GuestCheckoutError':
            return { success: false, errorCode: 'GUEST_CHECKOUT_DISABLED', message: response.message };
        case 'NoActiveOrderError':
            return { success: false, errorCode: 'NO_ACTIVE_ORDER', message: response.message };
        default:
            return { success: false, errorCode: 'UNKNOWN', message: 'Unknown error' };
    }
}
