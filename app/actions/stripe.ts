"use server"

import { stripe } from "@/lib/stripe"
import { FLYGOLD_PACKAGES } from "@/lib/products"

export async function startCheckoutSession(productId: string) {
  const product = FLYGOLD_PACKAGES.find((p) => p.id === productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.priceInCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      flygold_amount: product.flygoldAmount.toString(),
      product_id: product.id,
    },
  })

  return session.client_secret
}
