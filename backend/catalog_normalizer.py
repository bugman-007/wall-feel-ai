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

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


# Use Shopify COLLECTION HANDLES here, not display titles.
# Keep this mapping strict and non-overlapping.
CATEGORY_GROUP_MAPPING: Dict[str, List[str]] = {
    "Style": [
        "modern",
        "marble",
        "geometric",
        "nature",
        "wooden-slats",
        "artificial-flower",
        "agate",
    ],
    "Space": [
        "homes",
        "hotel",
        "restaurant",
        "beauty-salon",
        "barber-shop",
        "healthcare",
        "fast-food",
        "business",
    ],
    "Audience": [
        "children",
        "educational",
        "school-daycare",
    ],
    "Theme": [
        "animal",
        "dreamland",
        "motivation",
    ],
    "Custom": [
        "custom",
    ],
}

COLLECTION_TO_GROUP: Dict[str, str] = {}
for group, handles in CATEGORY_GROUP_MAPPING.items():
    for handle in handles:
        COLLECTION_TO_GROUP[handle] = group


@dataclass
class NormalizedMaterial:
    variant_id: str
    name: str
    price: float
    currency: str
    available: bool
    sku: Optional[str] = None
    compare_at_price: Optional[float] = None


@dataclass
class NormalizedProduct:
    id: str
    handle: str
    title: str
    description: Optional[str]
    image: Optional[str]
    images: List[str]
    shopify_collections: List[str]
    tags: List[str]
    app_categories: List[str]
    materials: List[NormalizedMaterial]
    style_labels: List[str] = field(default_factory=list)
    feel_labels: List[str] = field(default_factory=list)
    vendor: Optional[str] = None
    product_type: Optional[str] = None
    available: bool = True


@dataclass
class CategoryGroup:
    name: str
    categories: List[str]


def normalize_material(variant: Dict[str, Any]) -> Optional[NormalizedMaterial]:
    try:
        price_data = variant.get("price", {})
        if not price_data:
            logger.warning("Variant %s missing price data", variant.get("id"))
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
            ),
        )
    except (ValueError, TypeError, KeyError) as exc:
        logger.warning("Failed to normalize variant %s: %s", variant.get("id"), exc)
        return None


def extract_materials_from_variants(
    variants: List[Dict[str, Any]],
    options: Optional[List[Dict[str, Any]]] = None,
) -> List[NormalizedMaterial]:
    materials: List[NormalizedMaterial] = []
    seen_variant_ids: Set[str] = set()

    for variant in variants:
        variant_id = variant.get("id", "")
        if not variant_id or variant_id in seen_variant_ids:
            continue

        seen_variant_ids.add(variant_id)
        material = normalize_material(variant)
        if material:
            materials.append(material)

    materials.sort(key=lambda item: item.price)
    return materials


def get_app_categories_from_collections(
    shopify_collections: List[str],
    tags: List[str],
) -> List[str]:
    """
    Keep category grouping strict:
    - collections are the primary source
    - tags are only a fallback when collections are missing
    """
    matched_handles: Set[str] = set()

    for handle in shopify_collections:
        normalized_handle = _normalize_handle(handle)
        if normalized_handle in COLLECTION_TO_GROUP:
            matched_handles.add(normalized_handle)

    if not matched_handles:
        for tag in tags:
            normalized_tag = _normalize_handle(tag)
            if normalized_tag in COLLECTION_TO_GROUP:
                matched_handles.add(normalized_tag)

    return [_display_name_from_handle(handle) for handle in sorted(matched_handles)]


def get_category_groups_for_product(
    shopify_collections: List[str],
    tags: List[str],
) -> List[str]:
    groups: Set[str] = set()

    for handle in shopify_collections:
        normalized_handle = _normalize_handle(handle)
        if normalized_handle in COLLECTION_TO_GROUP:
            groups.add(COLLECTION_TO_GROUP[normalized_handle])

    if not groups:
        for tag in tags:
            normalized_tag = _normalize_handle(tag)
            if normalized_tag in COLLECTION_TO_GROUP:
                groups.add(COLLECTION_TO_GROUP[normalized_tag])

    return sorted(groups)


def normalize_product(shopify_product: Dict[str, Any]) -> NormalizedProduct:
    shopify_collections = _extract_collection_handles(shopify_product.get("collections", []))

    tags = shopify_product.get("tags", [])
    if isinstance(tags, str):
        tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
    else:
        tags = [str(tag).strip() for tag in tags if str(tag).strip()]

    featured_image = shopify_product.get("featuredImage")
    image_url = featured_image.get("url") if featured_image else None

    images_raw = shopify_product.get("images", {})
    image_urls = _extract_image_urls(images_raw)
    if not image_url and image_urls:
        image_url = image_urls[0]

    variants_raw = shopify_product.get("variants", {})
    variants = _extract_variant_nodes(variants_raw)
    materials = extract_materials_from_variants(variants)

    app_categories = get_app_categories_from_collections(shopify_collections, tags)

    from classification_rules import classify_product_feels, classify_product_styles

    title = shopify_product.get("title", "")
    style_labels = classify_product_styles(shopify_collections, tags, title)
    feel_labels = classify_product_feels(shopify_collections, tags, title)

    return NormalizedProduct(
        id=shopify_product.get("id", ""),
        handle=shopify_product.get("handle", ""),
        title=title,
        description=shopify_product.get("description"),
        image=image_url,
        images=image_urls,
        shopify_collections=[_normalize_handle(handle) for handle in shopify_collections],
        tags=tags,
        app_categories=app_categories,
        materials=materials,
        style_labels=style_labels,
        feel_labels=feel_labels,
        vendor=shopify_product.get("vendor"),
        product_type=shopify_product.get("productType"),
        available=shopify_product.get("availableForSale", True),
    )


def product_to_dict(product: NormalizedProduct) -> Dict[str, Any]:
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
        "styleLabels": product.style_labels,
        "feelLabels": product.feel_labels,
        "materials": [
            {
                "variantId": material.variant_id,
                "name": material.name,
                "price": material.price,
                "currency": material.currency,
                "available": material.available,
                "compareAtPrice": material.compare_at_price,
            }
            for material in product.materials
        ],
        "vendor": product.vendor,
        "productType": product.product_type,
        "available": product.available,
    }


def build_category_groups(collections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    shopify_by_handle = {
        _normalize_handle(collection.get("handle", "")): collection.get("title", "")
        for collection in collections
        if collection.get("handle")
    }

    groups: List[Dict[str, Any]] = []

    for group_name in ["Style", "Space", "Audience", "Theme", "Custom"]:
        display_categories = [
            shopify_by_handle[handle]
            for handle in CATEGORY_GROUP_MAPPING.get(group_name, [])
            if handle in shopify_by_handle
        ]

        if display_categories:
            groups.append({
                "name": group_name,
                "categories": sorted(display_categories),
            })

    return groups


def normalize_collection(shopify_collection: Dict[str, Any]) -> Dict[str, Any]:
    image = shopify_collection.get("image")
    products = shopify_collection.get("products", {})
    product_count = None

    if isinstance(products, dict):
        if "edges" in products and isinstance(products["edges"], list):
            product_count = len(products["edges"])
        elif "nodes" in products and isinstance(products["nodes"], list):
            product_count = len(products["nodes"])

    return {
        "id": shopify_collection.get("id", ""),
        "handle": shopify_collection.get("handle", ""),
        "title": shopify_collection.get("title", ""),
        "description": shopify_collection.get("description"),
        "image": image.get("url") if image else None,
        "productCount": product_count,
    }


def _extract_collection_handles(raw_collections: Any) -> List[str]:
    handles: List[str] = []

    if not isinstance(raw_collections, list):
        return handles

    for item in raw_collections:
        if isinstance(item, dict):
            handle = item.get("handle")
            if handle:
                handles.append(str(handle))
        elif isinstance(item, str) and item.strip():
            handles.append(item.strip())

    return handles


def _extract_image_urls(images_raw: Any) -> List[str]:
    urls: List[str] = []

    if isinstance(images_raw, dict):
        if isinstance(images_raw.get("edges"), list):
            for edge in images_raw["edges"]:
                node = edge.get("node", {}) if isinstance(edge, dict) else {}
                url = node.get("url")
                if url:
                    urls.append(url)
        elif isinstance(images_raw.get("nodes"), list):
            for node in images_raw["nodes"]:
                url = node.get("url") if isinstance(node, dict) else None
                if url:
                    urls.append(url)

    return urls


def _extract_variant_nodes(variants_raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(variants_raw, dict):
        return []
    if isinstance(variants_raw.get("nodes"), list):
        return [node for node in variants_raw["nodes"] if isinstance(node, dict)]
    if isinstance(variants_raw.get("edges"), list):
        return [
            edge.get("node", {})
            for edge in variants_raw["edges"]
            if isinstance(edge, dict) and isinstance(edge.get("node"), dict)
        ]
    return []


def _normalize_handle(value: str) -> str:
    return str(value).strip().lower().replace("_", "-").replace("/", "-")


def _display_name_from_handle(handle: str) -> str:
    return handle.replace("-", " ").title()
