'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CreditCard, Loader2 } from 'lucide-react';
import { useCheckout } from '../checkout-provider';
import {useTranslations} from 'next-intl';
import { createRazorpayCheckoutOrderAction, settleRazorpayPayment } from '../actions';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const RAZORPAY_CHECKOUT_JS = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpayCheckoutJs(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay Checkout.js')));
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay Checkout.js'));
    document.head.appendChild(script);
  });
}

interface PaymentStepProps {
  onComplete: () => void;
}

export default function PaymentStep({ onComplete }: PaymentStepProps) {
  const t = useTranslations('Checkout');
  const { paymentMethods, selectedPaymentMethodCode, setSelectedPaymentMethodCode } = useCheckout();

  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const isRazorpay = selectedPaymentMethodCode === 'razorpay';

  const handleContinue = () => {
    if (!selectedPaymentMethodCode || processing) return;
    if (!isRazorpay) {
      onComplete();
    }
  };

  const handleRazorpayPay = async () => {
    if (processing) return;
    setProcessing(true);
    setPayError(null);
    try {
      // 1. Backend creates the Razorpay order bound to the Vendure order total.
      const handle = await createRazorpayCheckoutOrderAction();
      // 2. Lazy-load Checkout.js only when the buyer actually pays.
      await loadRazorpayCheckoutJs();
      if (!window.Razorpay) throw new Error('Razorpay Checkout.js did not initialise');
      // 3. Open the modal; the promise resolves only via handler / modal close.
      const handshake = await new Promise<{ razorpay_payment_id: string; razorpay_signature: string }>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: handle.keyId,
          amount: handle.amountMinor,
          currency: handle.currency,
          order_id: handle.razorpayOrderId,
          // Settle through OUR backend only: the signature is verified
          // server-side against RAZORPAY_KEY_SECRET (never in the browser).
          handler: (resp: Record<string, string>) => {
            if (resp.razorpay_payment_id && resp.razorpay_signature) {
              resolve({ razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature });
            } else {
              reject(new Error('Razorpay did not return a payment handshake'));
            }
          },
          modal: { ondismiss: () => reject(new Error('Payment window closed before authorizing')) },
        });
        rzp.open();
      });
      // 4. Settle: verify signature + provider truth, then redirect to confirmation.
      const outcome = await settleRazorpayPayment({
        razorpayOrderId: handle.razorpayOrderId,
        razorpayPaymentId: handshake.razorpay_payment_id,
        razorpaySignature: handshake.razorpay_signature,
      });
      if (outcome.kind === 'coupon-removed') {
        // Amount binding changed under us: the Razorpay order no longer
        // matches. Buyer reviews the corrected total and pays again.
        setPayError(`Coupons changed the total (${outcome.removedCouponCodes.join(', ')} removed). Review the new total and try again.`);
        setProcessing(false);
        return;
      }
      if (outcome.kind === 'error') {
        setPayError(`${outcome.errorCode} - ${outcome.message}`);
        setProcessing(false);
        return;
      }
      // 'placed' redirects server-side via NEXT_REDIRECT; nothing to do here.
    } catch (error) {
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error;
      setPayError(error instanceof Error ? error.message : 'Razorpay payment failed');
      setProcessing(false);
    }
  };

  if (paymentMethods.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t('noPaymentMethods')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="font-semibold">{t('selectPaymentMethod')}</h3>

      <RadioGroup value={selectedPaymentMethodCode || ''} onValueChange={setSelectedPaymentMethodCode}>
        {paymentMethods.map((method) => (
          <Label key={method.code} htmlFor={method.code} className="cursor-pointer">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <RadioGroupItem value={method.code} id={method.code} />
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{method.name}</p>
                  {method.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {method.description}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </Label>
        ))}
      </RadioGroup>

      {payError && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <p className="font-medium">Razorpay payment failed</p>
          <p className="text-muted-foreground mt-1">{payError}</p>
        </div>
      )}

      {isRazorpay ? (
        <Button onClick={handleRazorpayPay} disabled={!selectedPaymentMethodCode || processing} className="w-full">
          {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {processing ? 'Processing Razorpay payment…' : t('continueToReview')}
        </Button>
      ) : (
        <Button
          onClick={handleContinue}
          disabled={!selectedPaymentMethodCode || processing}
          className="w-full"
        >
          {t('continueToReview')}
        </Button>
      )}
    </div>
  );
}
