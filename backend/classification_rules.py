"""
Classification Rules

Customer-facing classification layer for wallpaper products.
Derives style and feel labels from Shopify data (collections, tags, title).

This is a rule-based system - no AI/ML classification.
Products can belong to multiple styles and multiple feels (multi-label).
"""

from typing import List, Set


# Customer-facing style labels
STYLE_LABELS = [
    "Minimal",
    "Modern",
    "Luxury",
    "Organic",
    "Bold",
    "Classic",
    "Playful",
    "Commercial",
]

# Customer-facing feel labels
FEEL_LABELS = [
    "Calm",
    "Warm",
    "Statement",
    "Elegant",
    "Creative",
]

# Style classification rules: style -> keywords that trigger it
# Keywords are matched against collections, tags, and title (case-insensitive)
STYLE_KEYWORD_RULES = {
    "Minimal": [
        "minimal",
        "minimalist",
        "simple",
        "clean",
        "plain",
    ],
    "Modern": [
        "modern",
        "marble",
        "geometric",
        "agate",
        "abstract",
        "minimalist",
        "texture",
        "contemporary",
    ],
    "Luxury": [
        "luxury",
        "premium",
        "gold",
        "silver",
        "marble",
        "elegant",
        "opulent",
        "high-end",
    ],
    "Organic": [
        "nature",
        "wooden slats",
        "floral",
        "botanical",
        "wood",
        "natural",
        "earth",
        "plant",
        "leaf",
        "green",
    ],
    "Bold": [
        "bold",
        "geometric",
        "abstract",
        "pattern",
        "statement",
        "vibrant",
        "striking",
    ],
    "Classic": [
        "classic",
        "vintage",
        "damask",
        "traditional",
        "heritage",
        "timeless",
    ],
    "Playful": [
        "children",
        "dreamland",
        "animal",
        "kids",
        "nursery",
        "playroom",
        "fun",
        "colorful",
        "cartoon",
    ],
    "Commercial": [
        "hotel",
        "restaurant",
        "business",
        "office",
        "retail",
        "healthcare",
        "beauty salon",
        "barber shop",
        "commercial",
        "hospitality",
        "fast food",
        "store",
    ],
}

# Feel classification rules: feel -> keywords that trigger it
FEEL_KEYWORD_RULES = {
    "Calm": [
        "calm",
        "soft",
        "nature",
        "floral",
        "botanical",
        "neutral",
        "minimal",
        "serene",
        "peaceful",
        "quiet",
    ],
    "Warm": [
        "warm",
        "wood",
        "natural",
        "cozy",
        "organic",
        "earth",
        "earth tone",
        "beige",
        "brown",
        "welcoming",
    ],
    "Statement": [
        "bold",
        "geometric",
        "abstract",
        "pattern",
        "luxury",
        "marble",
        "dramatic",
        "eye-catching",
        "striking",
    ],
    "Elegant": [
        "elegant",
        "luxury",
        "premium",
        "classic",
        "damask",
        "gold",
        "sophisticated",
        "refined",
        "graceful",
    ],
    "Creative": [
        "creative",
        "colorful",
        "children",
        "animal",
        "dreamland",
        "artistic",
        "unique",
        "imaginative",
        "fun",
    ],
}


def classify_product_styles(
    collections: List[str],
    tags: List[str],
    title: str
) -> List[str]:
    """
    Classify a product's styles based on collections, tags, and title.

    Uses keyword matching to determine which style labels apply.
    A product can have multiple styles (multi-label classification).

    Args:
        collections: List of Shopify collection handles
        tags: List of product tags
        title: Product title

    Returns:
        List of style labels (e.g., ["Modern", "Luxury"])
    """
    styles: Set[str] = set()

    # Combine all text signals for matching
    all_text = _combine_text_for_matching(collections, tags, title)

    # Check each style's keywords
    for style, keywords in STYLE_KEYWORD_RULES.items():
        if _matches_any_keyword(all_text, keywords):
            styles.add(style)

    return sorted(list(styles))


def classify_product_feels(
    collections: List[str],
    tags: List[str],
    title: str
) -> List[str]:
    """
    Classify a product's feels based on collections, tags, and title.

    Uses keyword matching to determine which feel labels apply.
    A product can have multiple feels (multi-label classification).

    Args:
        collections: List of Shopify collection handles
        tags: List of product tags
        title: Product title

    Returns:
        List of feel labels (e.g., ["Elegant", "Statement"])
    """
    feels: Set[str] = set()

    # Combine all text signals for matching
    all_text = _combine_text_for_matching(collections, tags, title)

    # Check each feel's keywords
    for feel, keywords in FEEL_KEYWORD_RULES.items():
        if _matches_any_keyword(all_text, keywords):
            feels.add(feel)

    return sorted(list(feels))


def _combine_text_for_matching(
    collections: List[str],
    tags: List[str],
    title: str
) -> str:
    """
    Combine collections, tags, and title into a single lowercase string for matching.

    This ensures we catch keywords from any signal source.
    """
    parts = []

    # Add collections
    for collection in collections:
        if collection:
            parts.append(collection.lower())

    # Add tags
    for tag in tags:
        if tag:
            parts.append(tag.lower())

    # Add title
    if title:
        parts.append(title.lower())

    return " ".join(parts)


def _matches_any_keyword(text: str, keywords: List[str]) -> bool:
    """
    Check if any keyword appears in the text.

    Uses substring matching, so "modern" matches "modern design" and "contemporary modern".
    """
    return any(keyword.lower() in text for keyword in keywords)


def get_all_style_labels() -> List[str]:
    """Return all available style labels."""
    return STYLE_LABELS.copy()


def get_all_feel_labels() -> List[str]:
    """Return all available feel labels."""
    return FEEL_LABELS.copy()
