import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSettings } from "@/models/Settings";

const DEFAULT_POLICIES = {
  termsOfService: `Welcome to Frawst Fever Games. By creating an account or using our services, you agree to the following terms:

1. Account & Use
You are responsible for maintaining the confidentiality of your account and password. You agree to provide accurate, current, and complete information when signing up.

2. Purchases
All sales are subject to product availability. Prices are displayed in the listed currency and are inclusive of applicable taxes unless stated otherwise. We reserve the right to cancel any order if we detect fraud, pricing errors, or stock issues.

3. Product Condition
We describe pre-owned products as accurately as possible. Minor cosmetic variations may occur. If your item arrives significantly different than described, please contact us within 7 days.

4. Intellectual Property
All site content, including images, text, logos, and the Frawst Fever Games name, are owned by us or our licensors. You may not reproduce or redistribute them without permission.

5. Limitation of Liability
We are not liable for indirect, incidental, or consequential damages arising from your use of our services.

6. Changes
We may update these Terms at any time. Continued use of the service after changes take effect means you accept the updated Terms.`,

  privacyPolicy: `Your privacy matters to us. This policy describes how we collect, use, and protect your information.

1. Information We Collect
- Account info: name, email, password (encrypted), phone, shipping address
- Order info: items purchased, payment method (processed by Stripe — we never store card numbers), order history
- Usage info: pages visited, browser type (via standard web logs)

2. How We Use It
- To process and ship your orders
- To send order confirmations, shipping updates, and account notifications
- To respond to your support requests
- To improve our service and detect fraud

3. Sharing
We do not sell your personal information. We share data only with:
- Payment processors (Stripe) to complete your purchase
- Shipping carriers to deliver your orders
- Service providers (email, hosting) under strict confidentiality

4. Your Rights
You can view, update, or delete your account information at any time. Contact us to request account removal or a copy of your data.

5. Cookies
We use essential cookies to keep you signed in and to remember your cart. You can disable cookies in your browser, but some features may not work.

6. Security
We use industry-standard encryption and secure storage. No system is 100% secure, but we take reasonable measures to protect your information.`,

  returnPolicy: `Returns are accepted within 14 days of delivery for items in their original condition.

- Contact us at contact@frawstfevergames.ca before returning any item
- Buyer is responsible for return shipping unless the item arrived damaged or not as described
- Refunds are issued within 5 business days of receiving the returned item
- Opened collectibles and digital goods are non-returnable`,

  shippingPolicy: `We currently ship within Canada only.

- Orders ship within 1–3 business days of payment
- Local pickup is available for select items (see product page)
- Shipping rates are calculated at checkout based on weight and destination
- Tracking numbers are emailed once your order is handed to the carrier
- Delivery times vary by province, typically 3–7 business days`,
};

export async function GET() {
  try {
    await connectDB();
    const settings = await getSettings();
    return NextResponse.json({
      termsOfService: settings.termsOfService?.trim() || DEFAULT_POLICIES.termsOfService,
      privacyPolicy: settings.privacyPolicy?.trim() || DEFAULT_POLICIES.privacyPolicy,
      returnPolicy: settings.returnPolicy?.trim() || DEFAULT_POLICIES.returnPolicy,
      shippingPolicy: settings.shippingPolicy?.trim() || DEFAULT_POLICIES.shippingPolicy,
    });
  } catch {
    // DB unreachable — still return defaults
    return NextResponse.json(DEFAULT_POLICIES);
  }
}
