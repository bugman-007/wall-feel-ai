"""
Sync catalog.json with Shopify product data

Run this script to update the static catalog.json file with Shopify products.
This allows the fallback path in /api/ai-generate-preview to work without
calling the Shopify API every time.

Usage:
    python sync_catalog.py
"""

import asyncio
import json
from pathlib import Path
from shopify_client import get_shopify_client
from catalog_normalizer import normalize_product

async def sync_catalog():
    """Fetch products from Shopify and write to catalog.json."""
    print("Fetching products from Shopify...")

    client = get_shopify_client()

    # Fetch first 20 products only (for faster sync, enough for fallback)
    products = await client.get_all_products(products_per_page=20, variants_first=50)

    if not products:
        print("ERROR: No products fetched from Shopify")
        return

    print(f"Fetched {len(products)} products")

    # Convert to legacy catalog format
    designs = []
    for product in products:
        normalized = normalize_product(product)
        if normalized.image:
            designs.append({
                "id": normalized.handle,
                "name": normalized.title,
                "category": normalized.app_categories[0] if normalized.app_categories else "default",
                "thumbnail_url": normalized.image,
                "full_url": normalized.image,
                "description": normalized.description or "",
                "shopify_id": normalized.id,
                "handle": normalized.handle,
                "materials": [
                    {
                        "variantId": m.variant_id,
                        "name": m.name,
                        "price": m.price,
                        "currency": m.currency,
                        "available": m.available
                    }
                    for m in normalized.materials
                ]
            })

    # Write to catalog.json
    catalog_path = Path(__file__).parent / "catalog.json"
    catalog_data = {"designs": designs}

    with open(catalog_path, "w") as f:
        json.dump(catalog_data, f, indent=2)

    print(f"Written {len(designs)} designs to catalog.json")
    print(f"First design: {designs[0]['name']} ({designs[0]['id']})")


if __name__ == "__main__":
    asyncio.run(sync_catalog())
