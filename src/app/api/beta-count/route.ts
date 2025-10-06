import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  try {
    // Get the BETA50 promotion code from Stripe
    const promoCodes = await stripe.promotionCodes.list({
      code: 'BETA50',
      limit: 1
    });
    
    const redeemed = promoCodes.data[0]?.times_redeemed || 0;
    
    return Response.json({ redeemed });
  } catch (error) {
    return Response.json({ redeemed: 0 });
  }
}