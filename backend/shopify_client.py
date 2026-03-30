"""
Shopify Storefront API Client

Handles all communication with Shopify's GraphQL Storefront API.
Uses the public access token for unauthenticated reads (products, collections).
"""

import os
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
import httpx

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class ShopifyConfig:
    """Shopify Storefront API configuration."""
    store_url: str
    access_token: str
    api_version: str

    @classmethod
    def from_env(cls) -> "ShopifyConfig":
        """Load configuration from environment variables."""
        return cls(
            store_url=os.getenv("SHOPIFY_STORE_URL", ""),
            access_token=os.getenv("SHOPIFY_ACCESS_TOKEN", ""),
            api_version=os.getenv("SHOPIFY_API_VERSION", "2026-01")
        )

    @property
    def api_endpoint(self) -> str:
        """Get the GraphQL API endpoint URL."""
        # Extract store name from URL (e.g., https://fspt6z-in.myshopify.com -> fspt6z-in)
        store_name = self.store_url.replace("https://", "").replace(".myshopify.com", "")
        return f"https://{store_name}.myshopify.com/api/{self.api_version}/graphql.json"


class ShopifyClient:
    """
    Client for Shopify Storefront GraphQL API.

    Handles:
    - Authentication with Storefront access token
    - GraphQL query execution
    - Pagination with cursors
    - Error handling and retries
    - Response parsing
    """

    def __init__(self, config: Optional[ShopifyConfig] = None):
        self.config = config or ShopifyConfig.from_env()
        self._client: Optional[httpx.AsyncClient] = None

        # Validate configuration
        if not self.config.store_url or not self.config.access_token:
            logger.warning("Shopify credentials not fully configured")

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client with proper headers."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                headers={
                    "Content-Type": "application/json",
                    "X-Shopify-Storefront-Access-Token": self.config.access_token,
                }
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def execute_query(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Execute a GraphQL query and return the response data.

        Args:
            query: GraphQL query string
            variables: Optional query variables

        Returns:
            Response data dict or None if request failed
        """
        try:
            client = await self._get_client()

            payload = {"query": query}
            if variables:
                payload["variables"] = variables

            response = await client.post(
                self.config.api_endpoint,
                json=payload
            )
            response.raise_for_status()

            result = response.json()

            # Check for GraphQL errors
            if "errors" in result:
                logger.error(f"Shopify GraphQL errors: {result['errors']}")
                return None

            return result.get("data")

        except httpx.HTTPStatusError as e:
            logger.error(f"Shopify API HTTP error: {e.response.status_code} - {e.response.text}")
            return None
        except httpx.RequestError as e:
            logger.error(f"Shopify API request error: {e}")
            return None
        except Exception as e:
            logger.error(f"Shopify API unexpected error: {e}", exc_info=True)
            return None

    # ============== Collection Queries ==============

    async def get_collections(
        self,
        first: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Fetch all collections from Shopify.

        Args:
            first: Number of collections to fetch (max 250)

        Returns:
            List of collection dicts with id, title, handle
        """
        query = """
        query GetCollections($first: Int!) {
          collections(first: $first, sortKey: ID) {
            edges {
              node {
                id
                title
                handle
                description
                image {
                  url
                  altText
                }
              }
            }
          }
        }
        """

        result = await self.execute_query(query, {"first": first})
        if not result:
            return []

        collections = result.get("collections", {}).get("edges", [])
        return [edge["node"] for edge in collections]

    async def get_collection_by_handle(
        self,
        handle: str,
        products_first: int = 50,
        variants_first: int = 250
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch a single collection by handle with its products.

        Args:
            handle: Collection handle (e.g., "modern")
            products_first: Products per page
            variants_first: Variants per product (max 250)

        Returns:
            Collection dict with products and variants, or None
        """
        query = """
        query GetCollection($handle: String!, $productsFirst: Int!, $variantsFirst: Int!) {
          collection(handle: $handle) {
            id
            title
            handle
            description
            image {
              url
              altText
            }
            products(first: $productsFirst, sortKey: COLLECTION_DEFAULT) {
              pageInfo {
                hasNextPage
                hasPreviousPage
                endCursor
                startCursor
              }
              edges {
                node {
                  id
                  title
                  handle
                  vendor
                  productType
                  tags
                  availableForSale
                  featuredImage {
                    url
                    altText
                  }
                  images(first: 5) {
                    edges {
                      node {
                        url
                        altText
                      }
                    }
                  }
                  variants(first: $variantsFirst) {
                    nodes {
                      id
                      title
                      availableForSale
                      price {
                        amount
                        currencyCode
                      }
                      compareAtPrice {
                        amount
                        currencyCode
                      }
                      image {
                        url
                        altText
                      }
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """

        result = await self.execute_query(
            query,
            {"handle": handle, "productsFirst": products_first, "variantsFirst": variants_first}
        )

        if not result:
            return None

        return result.get("collection")

    async def get_collection_products_paginated(
        self,
        handle: str,
        products_per_page: int = 50,
        variants_first: int = 250
    ) -> List[Dict[str, Any]]:
        """
        Fetch all products from a collection with pagination.

        Args:
            handle: Collection handle
            products_per_page: Products per page
            variants_first: Variants per product

        Returns:
            List of all products in collection
        """
        all_products = []
        cursor = None
        has_more = True

        while has_more:
            query = """
            query GetCollectionProducts(
                $handle: String!,
                $first: Int!,
                $after: String,
                $variantsFirst: Int!
            ) {
                collection(handle: $handle) {
                    products(first: $first, after: $after, sortKey: COLLECTION_DEFAULT) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        edges {
                            node {
                                id
                                title
                                handle
                                vendor
                                productType
                                tags
                                availableForSale
                                featuredImage {
                                    url
                                    altText
                                }
                                images(first: 5) {
                                    edges {
                                        node {
                                            url
                                            altText
                                        }
                                    }
                                }
                                variants(first: $variantsFirst) {
                                    nodes {
                                        id
                                        title
                                        availableForSale
                                        price {
                                            amount
                                            currencyCode
                                        }
                                        compareAtPrice {
                                            amount
                                            currencyCode
                                        }
                                        image {
                                            url
                                            altText
                                        }
                                        selectedOptions {
                                            name
                                            value
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            """

            variables = {
                "handle": handle,
                "first": products_per_page,
                "variantsFirst": variants_first
            }
            if cursor:
                variables["after"] = cursor

            result = await self.execute_query(query, variables)

            if not result:
                break

            collection = result.get("collection")
            if not collection:
                break

            products_data = collection.get("products", {})
            edges = products_data.get("edges", [])
            products = [edge["node"] for edge in edges]
            all_products.extend(products)

            # Check for more pages
            page_info = products_data.get("pageInfo", {})
            has_more = page_info.get("hasNextPage", False)
            cursor = page_info.get("endCursor")

        return all_products

    # ============== Product Queries ==============

    async def get_product_by_handle(
        self,
        handle: str,
        variants_first: int = 250
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch a single product by handle.

        Args:
            handle: Product handle (e.g., "vintage-floral-wallpaper")
            variants_first: Variants to fetch (max 250)

        Returns:
            Product dict with full details, or None
        """
        query = """
        query GetProduct($handle: String!, $variantsFirst: Int!) {
            product(handle: $handle) {
                id
                title
                handle
                vendor
                productType
                description
                descriptionHtml
                tags
                availableForSale
                createdAt
                updatedAt
                featuredImage {
                    url
                    altText
                }
                images(first: 10) {
                    edges {
                        node {
                            url
                            altText
                        }
                    }
                }
                priceRange {
                    minVariantPrice {
                        amount
                        currencyCode
                    }
                    maxVariantPrice {
                        amount
                        currencyCode
                    }
                }
                options(first: 10) {
                    name
                    values
                }
                variants(first: $variantsFirst) {
                    nodes {
                        id
                        title
                        availableForSale
                        price {
                            amount
                            currencyCode
                        }
                        compareAtPrice {
                            amount
                            currencyCode
                        }
                        image {
                            url
                            altText
                        }
                        selectedOptions {
                            name
                            value
                        }
                    }
                }
            }
        }
        """

        result = await self.execute_query(
            query,
            {"handle": handle, "variantsFirst": variants_first}
        )

        if not result:
            return None

        return result.get("product")

    async def get_all_products(
        self,
        products_per_page: int = 50,
        variants_first: int = 250
    ) -> List[Dict[str, Any]]:
        """
        Fetch all products from the store with pagination.

        Args:
            products_per_page: Products per page
            variants_first: Variants per product

        Returns:
            List of all products
        """
        all_products = []
        cursor = None
        has_more = True

        while has_more:
            query = """
            query GetProducts($first: Int!, $after: String, $variantsFirst: Int!) {
                products(first: $first, after: $after, sortKey: CREATED_AT) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    edges {
                        node {
                            id
                            title
                            handle
                            vendor
                            productType
                            tags
                            availableForSale
                            featuredImage {
                                url
                                altText
                            }
                            images(first: 5) {
                                edges {
                                    node {
                                        url
                                        altText
                                    }
                                }
                            }
                            variants(first: $variantsFirst) {
                                nodes {
                                    id
                                    title
                                    availableForSale
                                    price {
                                        amount
                                        currencyCode
                                    }
                                    compareAtPrice {
                                        amount
                                        currencyCode
                                    }
                                    image {
                                        url
                                        altText
                                    }
                                    selectedOptions {
                                        name
                                        value
                                    }
                                }
                            }
                        }
                    }
                }
            }
            """

            variables = {
                "first": products_per_page,
                "variantsFirst": variants_first
            }
            if cursor:
                variables["after"] = cursor

            result = await self.execute_query(query, variables)

            if not result:
                break

            products_data = result.get("products", {})
            edges = products_data.get("edges", [])
            products = [edge["node"] for edge in edges]
            all_products.extend(products)

            # Check for more pages
            page_info = products_data.get("pageInfo", {})
            has_more = page_info.get("hasNextPage", False)
            cursor = page_info.get("endCursor")

        return all_products


# Global singleton instance
_shopify_client: Optional[ShopifyClient] = None


def get_shopify_client() -> ShopifyClient:
    """Get or create the global Shopify client instance."""
    global _shopify_client
    if _shopify_client is None:
        _shopify_client = ShopifyClient()
    return _shopify_client


async def close_shopify_client():
    """Close the global Shopify client."""
    global _shopify_client
    if _shopify_client:
        await _shopify_client.close()
        _shopify_client = None
