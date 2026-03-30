"""
Catalog Normalizer

Transforms raw Shopify data into app-facing normalized structures.
Handles:
- Product normalization to consistent schema
- Category grouping (Style, Space, Audience, Theme, Custom)
- Material extraction from variants
- Handling the "Matarial" typo in Shopify data
- Multi-path product discoverability
"""

import logging
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# Category mapping: Shopify collections -> App category groups
# This allows flexible categorization that's cleaner than raw Shopify data
CATEGORY_GROUP_MAPPING: Dict[str, List[str]] = {
    "Style": [
        "modern", "marble", "geometric", "nature", "wooden slats", "agate",
        "artificial flower", "dreamland", "abstract", "minimalist", "texture",
        "vintage", "floral", "botanical", "pattern", "stripes", "damask"
    ],
    "Space": [
        "homes", "hotel", "restaurant", "beauty salon", "barber shop",
        "healthcare", "fast food", "business", "hospitality", "office",
        "retail", "commercial", "residential", "bedroom", "living room",
        "kitchen", "bathroom", "dining room"
    ],
    "Audience": [
        "children", "educational", "school/daycare", "school", "daycare",
        "kids", "nursery", "playroom"
    ],
    "Theme": [
        "animal", "motivation", "inspirational", "quotes", "nature",
        "travel", "city", "landscape", "seasonal", "holiday"
    ],
    "Custom": ["custom", "bespoke", "personalized", "made to order"]
}

# Reverse mapping: collection handle -> group name
COLLECTION_TO_GROUP: Dict[str, str] = {}
for group, collections in CATEGORY_GROUP_MAPPING.items():
    for collection in collections:
        COLLECTION_TO_GROUP[collection.lower()] = group


@dataclass
class NormalizedMaterial:
    """Normalized material variant data."""
    variant_id: str
    name: str
    price: float
    currency: str
    available: bool
    sku: Optional[str] = None
    compare_at_price: Optional[float] = None


@dataclass
class NormalizedProduct:
    """Normalized product data for frontend consumption."""
    id: str
    handle: str
    title: str
    description: Optional[str]
    image: Optional[str]
    images: List[str]
    shopify_collections: List[str]
    tags: List[str]
    app_categories: List[str]  # Derived categories from our grouping
    materials: List[NormalizedMaterial]
    vendor: Optional[str] = None
    product_type: Optional[str] = None
    available: bool = True


@dataclass
class CategoryGroup:
    """Grouped category for browsing."""
    name: str
    categories: List[str]


def normalize_material(variant: Dict[str, Any]) -> Optional[NormalizedMaterial]:
    """
    Normalize a Shopify variant to our Material schema.

    Handles the "Matarial" typo by checking for both spellings.
    """
    try:
        price_data = variant.get("price", {})
        if not price_data:
            logger.warning(f"Variant {variant.get('id')} missing price data")
            return None

        price_amount = price_data.get("amount")
        if price_amount is None:
            return None

        return NormalizedMaterial(
            variant_id=variant.get("id", ""),
            name=variant.get("title", "Default"),
            price=float(price_amount),
            currency=price_data.get("currencyCode", "GBP"),
            available=variant.get("availableForSale", False),
            sku=variant.get("sku"),
            compare_at_price=(
                float(variant.get("compareAtPrice", {}).get("amount"))
                if variant.get("compareAtPrice")
                else None
            )
        )
    except (ValueError, TypeError, KeyError) as e:
        logger.warning(f"Failed to normalize variant {variant.get('id')}: {e}")
        return None


def extract_materials_from_variants(
    variants: List[Dict[str, Any]],
    options: Optional[List[Dict[str, Any]]] = None
) -> List[NormalizedMaterial]:
    """
    Extract materials from product variants.

    Shopify stores material as a variant option (e.g., "Matarial: Easy Peel & Stick").
    We need to parse this and create clean material entries.

    Args:
        variants: List of variant dicts from Shopify
        options: Product options defining what each variant option means

    Returns:
        List of normalized materials, deduplicated and sorted by price
    """
    materials: List[NormalizedMaterial] = []
    seen_variant_ids: Set[str] = set()

    # Build option name mapping if options provided
    # This helps us identify which selectedOption corresponds to "Material"
    material_option_names: Set[str] = {"material", "matarial", "type", "finish"}

    for variant in variants:
        variant_id = variant.get("id", "")
        if variant_id in seen_variant_ids:
            continue
        seen_variant_ids.add(variant_id)

        material = normalize_material(variant)
        if material:
            materials.append(material)

    # Sort by price (lowest first)
    materials.sort(key=lambda m: m.price)

    return materials


def get_app_categories_from_collections(
    shopify_collections: List[str],
    tags: List[str]
) -> List[str]:
    """
    Derive app-facing categories from Shopify collections and tags.

    A product can belong to multiple categories across different groups.
    This enables multi-path discovery (e.g., find by Style OR by Space).

    Args:
        shopify_collections: List of Shopify collection handles
        tags: Product tags

    Returns:
        List of normalized category names
    """
    categories: Set[str] = set()

    # Check collections against our mapping
    for collection in shopify_collections:
        collection_lower = collection.lower()
        # Use the original casing from our mapping if found
        for group, collections in CATEGORY_GROUP_MAPPING.items():
            if collection_lower in [c.lower() for c in collections]:
                # Find the original casing
                for c in collections:
                    if c.lower() == collection_lower:
                        categories.add(c)
                        break

    # Also check tags for additional categories
    for tag in tags:
        tag_lower = tag.lower().strip()
        for group, collections in CATEGORY_GROUP_MAPPING.items():
            if tag_lower in [c.lower() for c in collections]:
                for c in collections:
                    if c.lower() == tag_lower:
                        categories.add(c)
                        break

    return sorted(list(categories))


def get_category_groups_for_product(
    shopify_collections: List[str],
    tags: List[str]
) -> List[str]:
    """
    Get the group names (Style, Space, etc.) that this product belongs to.

    Used for organizing the category browsing UI.
    """
    groups: Set[str] = set()

    all_identifiers = [c.lower() for c in shopify_collections] + [t.lower() for t in tags]

    for identifier in all_identifiers:
        if identifier in COLLECTION_TO_GROUP:
            groups.add(COLLECTION_TO_GROUP[identifier])

    return sorted(list(groups))


def normalize_product(shopify_product: Dict[str, Any]) -> NormalizedProduct:
    """
    Normalize a raw Shopify product to our app-facing schema.

    Args:
        shopify_product: Raw product dict from Shopify API

    Returns:
        NormalizedProduct ready for frontend consumption
    """
    # Extract collection handles from product (if available via collection query)
    # For now, we'll derive from tags and product type
    shopify_collections = shopify_product.get("collections", [])
    if isinstance(shopify_collections, list):
        shopify_collections = [c.get("handle", "") for c in shopify_collections if c.get("handle")]

    tags = shopify_product.get("tags", [])
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]

    # Get featured image
    featured_image = shopify_product.get("featuredImage")
    image_url = featured_image.get("url") if featured_image else None

    # Get all images
    images_data = shopify_product.get("images", {}).get("edges", [])
    image_urls = [
        edge["node"]["url"]
        for edge in images_data
        if edge.get("node", {}).get("url")
    ]

    # If no featured image, use first image
    if not image_url and image_urls:
        image_url = image_urls[0]

    # Extract materials from variants
    variants = shopify_product.get("variants", {}).get("nodes", [])
    materials = extract_materials_from_variants(variants)

    # Derive app categories
    app_categories = get_app_categories_from_collections(shopify_collections, tags)

    return NormalizedProduct(
        id=shopify_product.get("id", ""),
        handle=shopify_product.get("handle", ""),
        title=shopify_product.get("title", ""),
        description=shopify_product.get("description"),
        image=image_url,
        images=image_urls,
        shopify_collections=[c.lower() for c in shopify_collections],
        tags=tags,
        app_categories=app_categories,
        materials=materials,
        vendor=shopify_product.get("vendor"),
        product_type=shopify_product.get("productType"),
        available=shopify_product.get("availableForSale", True)
    )


def product_to_dict(product: NormalizedProduct) -> Dict[str, Any]:
    """Convert NormalizedProduct to dict for JSON response."""
    return {
        "id": product.id,
        "handle": product.handle,
        "title": product.title,
        "description": product.description,
        "image": product.image,
        "images": product.images,
        "shopifyCollections": product.shopify_collections,
        "tags": product.tags,
        "appCategories": product.app_categories,
        "materials": [
            {
                "variantId": m.variant_id,
                "name": m.name,
                "price": m.price,
                "currency": m.currency,
                "available": m.available,
                "compareAtPrice": m.compare_at_price
            }
            for m in product.materials
        ],
        "vendor": product.vendor,
        "productType": product.product_type,
        "available": product.available
    }


def build_category_groups(collections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Build grouped category structure for browsing UI.

    Groups collections into Style, Space, Audience, Theme, Custom categories.

    Args:
        collections: List of Shopify collection dicts

    Returns:
        List of category group dicts
    """
    # Collect all unique collection handles from Shopify
    all_handles: Set[str] = set()
    for collection in collections:
        handle = collection.get("handle", "").lower()
        if handle:
            all_handles.add(handle)

    # Also add any handles from our mapping that might not exist yet
    for group, handles in CATEGORY_GROUP_MAPPING.items():
        all_handles.update([h.lower() for h in handles])

    # Build groups with actual collections
    groups: List[Dict[str, Any]] = []

    for group_name in ["Style", "Space", "Audience", "Theme", "Custom"]:
        mapped_handles = CATEGORY_GROUP_MAPPING.get(group_name, [])

        # Find which of our mapped categories actually exist in Shopify
        existing_categories = []
        for handle in mapped_handles:
            # Check if this handle exists in Shopify collections
            for collection in collections:
                if collection.get("handle", "").lower() == handle.lower():
                    # Use the Shopify title, not our mapped name
                    existing_categories.append(collection.get("title", handle.title()))
                    break
            else:
                # Handle not found in Shopify, but include it anyway for browsing
                # (products might have tags that match)
                # Capitalize nicely
                nice_name = handle.replace("-", " ").title()
                if nice_name not in existing_categories:
                    existing_categories.append(nice_name)

        if existing_categories:
            groups.append({
                "name": group_name,
                "categories": sorted(existing_categories)
            })

    return groups


def normalize_collection(shopify_collection: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a Shopify collection for frontend."""
    image = shopify_collection.get("image")
    return {
        "id": shopify_collection.get("id", ""),
        "handle": shopify_collection.get("handle", ""),
        "title": shopify_collection.get("title", ""),
        "description": shopify_collection.get("description"),
        "image": image.get("url") if image else None,
        "productCount": shopify_collection.get("products", {}).get("edges", []).__len__()
        if isinstance(shopify_collection.get("products"), dict)
        else None
    }
