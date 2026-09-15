'use server';

import { mutate } from '@/lib/vendure/api';
import { AddToCartMutation, ApplyMarketplaceReferenceMutation } from '@/lib/vendure/mutations';
import { updateTag } from 'next/cache';
import { setAuthToken } from '@/lib/auth';
import { getActiveCurrencyCode } from '@/lib/currency-server';
import { getLocale, getTranslations } from 'next-intl/server';

export async function addToCart(variantId: string, quantity: number = 1, marketplaceRef?: string) {
  const locale = await getLocale();
  const currencyCode = await getActiveCurrencyCode();
  const t = await getTranslations({locale, namespace: 'Errors'});

  try {
    const result = await mutate(AddToCartMutation, { variantId, quantity }, { useAuthToken: true, currencyCode });

    if (result.token) {
      await setAuthToken(result.token);
    }

    if (result.data.addItemToOrder.__typename === 'Order') {
      // Attribution bridge (INV-008): if the landing URL carried a marketplace
      // ref, attach it to the now-active order via the server-verified mutation.
      // Fail-closed: any failure degrades to orderSource='direct' and never
      // blocks the cart. The client can never select orderSource — the ref is
      // HMAC-verified server-side at apply time and re-verified at placement.
      if (marketplaceRef) {
        try {
          await mutate(
            ApplyMarketplaceReferenceMutation,
            { ref: marketplaceRef },
            { useAuthToken: true, currencyCode }
          );
        } catch {
          // non-blocking by design
        }
      }
      // Revalidate cart data across all pages
      updateTag('cart');
      updateTag('active-order');
      return { success: true, order: result.data.addItemToOrder };
    } else {
      return { success: false, error: result.data.addItemToOrder.message };
    }
  } catch {
    return { success: false, error: t('failedAddToCart') };
  }
}
