const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

// Razorpay Checkout ka script zaroorat par hi (Pay dabane par) aata hai, aur ek hi baar.
let loading = null;
function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.onload = resolve;
    script.onerror = () => {
      loading = null; // agli baar phir koshish ho sake
      reject(new Error('Could not load the payment window. Check your internet connection and try again.'));
    };
    document.body.appendChild(script);
  });
  return loading;
}

// Payment ki khidki kholta hai. order: server ke /billing/checkout ka jawab.
// Return: payment hui to { orderId, paymentId, signature } (server ko verify ke liye); user ne khidki band ki to null.
export async function openCheckout(order) {
  await loadScript();
  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      handler: (response) =>
        resolve({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        }),
      modal: { ondismiss: () => resolve(null) },
    });
    checkout.on('payment.failed', (response) => reject(new Error(response.error?.description || 'The payment failed. Please try again.')));
    checkout.open();
  });
}
