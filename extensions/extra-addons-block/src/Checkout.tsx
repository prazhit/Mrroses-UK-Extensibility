// ts-ignore

import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useState, useEffect, useCallback} from "preact/hooks";

import {
  useCartLines,
  useApplyCartLinesChange,
  useApi,
  useAttributeValues,
  useSettings,
} from '@shopify/ui-extensions/checkout/preact';

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  
const { query, i18n } = useApi();
  const { addon_title, collection_ids } = useSettings();

  const collectionIds = collection_ids ? String(collection_ids).includes(",") ? String(collection_ids)?.split(", ").map(id => parseInt(id)) : [parseInt(String(collection_ids))] : ["318603198604"];
  
  // const alt_collection_ids = alternative_collection_ids 
  // ? String(alternative_collection_ids).includes(",") 
  // ? String(alternative_collection_ids)?.split(", ").map(id => parseInt(id)) : [parseInt(String(alternative_collection_ids))] : [];
  const applyCartLinesChange = useApplyCartLinesChange();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddonBlock, setShowAddonBlock] = useState(false);
  const [adding, setAdding] = useState({});
  const [showError, setShowError] = useState(false);
  const [selectedTab, setSelectedTab] = useState('tab1');
  const [collectionId, setCollectionId] = useState(() => {
    if (collectionIds && collectionIds.length > 0) {
      return 'gid://shopify/Collection/' + collectionIds[0];
    }
    return null;
  });
  const lines = useCartLines();
  // const { zip, city } = useShippingAddress();
  const [Location_Regionname] = useAttributeValues(['Location_Regionname']);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showError]);

  // useEffect(() => {
  //   if (Location_Regionname == "sydney") {
  //     setShowHamper(true);
  //   } else {
  //     setShowHamper(false);
  //   }
  // }, [zip, city, Location_Regionname])

   useEffect(() => {
    async function loadProducts() {
      const hasVday = await isVdayProductInCart(lines);
      if (!hasVday) {
        setShowAddonBlock(false);
        return;
      } else {
        setShowAddonBlock(true);
      }
      fetchCollectionProducts(collectionId);
    } 
    loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, lines]);

  async function handleAddToCart(variantId) {
    setAdding(prev => ({
      ...prev,
      [variantId]: true,
    }));
    // Get the current lines from the cart
    const result = await applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: variantId,
      quantity: 1,
    });
    setAdding(prev => ({
      ...prev,
      [variantId]: false,
    }));
    if (result.type === 'error') {
      setShowError(true);
      console.error(result.message);
    }
  }

  const getProductTags = async (productID) => {
    try {
      const { data } = await query(
      `query ($id: ID!) {
        product(id: $id) {
          id
          title
          tags
        }
      }`,
      {
        variables: { id: productID },
      }
    );
      interface ProductData {
        product?: {
          id: string;
          title: string;
          tags: string[];
        };
      }
      return (data as ProductData).product?.tags || [];
    } catch (error) {
      console.error(error);
      return [];
    } 
  }

  const fetchCollectionProducts = useCallback(async (collectionId) => {
    setLoading(true);
    try {
      const { data } = await query(
        `query ($id: ID!, $first: Int!) {
          collection(id: $id) {
            id
            title
            products(first: $first) {
              nodes {
                id
                title
                tags
                images(first: 1) {
                  nodes {
                    url
                  }
                }
                variants(first: 1) {
                  nodes {
                    id
                    price {
                      amount
                    }
                    availableForSale
                  }
                }
              }
            }
          }
        }`,
        {
          variables: { id: collectionId, first: 20 },
        }
      );
      interface Product {
        id: string;
        title: string;
        tags: string[];
        images: { nodes: Array<{ url: string }> };
        variants: { nodes: Array<{ id: string; price: { amount: string }; availableForSale: boolean }> };
      }
      const collectionData = data as { collection?: { products?: { nodes: Product[] } } };
      setProducts(collectionData.collection?.products.nodes);
    } catch (error) { 
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [query]);


  if (!loading && products.length === 0) {
    return null;
  }

  async function isVdayProductInCart(lines) {
    for (const line of lines) {
      const productId = line.merchandise?.product?.id;
      if (!productId) continue;

      const tags = await getProductTags(productId);
      if (tags.includes("vday2026")) return true;
    }
    return false;
  }

  const getLineIds = () => {
    const productIDs = [];
    lines.forEach((line) => {
      productIDs.push(line.merchandise.product.id);
    });
    return productIDs;
  }

  const addonsData = collectionIds !== undefined ? [
    {
      tabId: 'tab1',
      collectionId: collectionIds[0] ? 'gid://shopify/Collection/' + collectionIds[0] : '',
      imageUrl: {
        selected: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/star-white.svg?v=1723089001',
        default: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/star.svg?v=1723089001'
      },
      label: 'Trending',
      labelMobile: 'Trending'
    },
    {
      tabId: 'tab2',
      collectionId: collectionIds[1] ? 'gid://shopify/Collection/' + collectionIds[1] : '',
      imageUrl: {
        selected: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/champagne-white.svg?v=1723095160',
        default: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/champagne.svg?v=1723095160'
      },
      label: 'Bubbles',
      labelMobile: 'Bubbles'
    },
    {
      tabId: 'tab3',
      collectionId: collectionIds[2] ? 'gid://shopify/Collection/' + collectionIds[2] : '',
      imageUrl: {
        selected: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/chocolates-white.svg?v=1723095159',
        default: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/chocolates.svg?v=1723095159'
      },
      label: 'Chocolate',
      labelMobile: 'Choccy'
    },
    {
      tabId: 'tab4',
      collectionId: collectionIds[3] ? 'gid://shopify/Collection/' + collectionIds[3] : '',
      imageUrl: {
        selected: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/teddies-white.svg?v=1723095160',
        default: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/teddies.svg?v=1723095160'
      },
      label: 'Teddies',
      labelMobile: 'Teddies'
    },
    {
      tabId: 'tab5',
      collectionId: collectionIds[4] ? 'gid://shopify/Collection/' + collectionIds[4] : '',
      imageUrl: {
        selected: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/candles-white.svg?v=1723095160',
        default: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/candles.svg?v=1723095159'
      },
      label: 'Candles',
      labelMobile: 'Candles'
    },
    // {
    //   tabId: 'tab6',
    //   collectionId: collectionIds[5] ? 'gid://shopify/Collection/' + (showHamper && alt_collection_ids.length > 0 ? alt_collection_ids[0] : collectionIds[5]) : '',
    //   imageUrl: {
    //     selected: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/gift-bundles-white.svg?v=1723095159',
    //     default: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/gift-bundles.svg?v=1723095159'
    //   },
    //   label: showHamper ? 'Hampers' : 'Gift Bundles',
    //   labelMobile: showHamper ? 'Hampers' : 'Gift',
    // },
    {
      tabId: 'tab7',
      collectionId: collectionIds[6] ? 'gid://shopify/Collection/' + collectionIds[6] : '',
      imageUrl: {
        selected: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/new-baby-white.svg?v=1723095159',
        default: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/new-baby.svg?v=1723095160'
      },
      label: 'Baby',
      labelMobile: 'Baby'
    },
    {
      tabId: 'tab8',
      collectionId: collectionIds[7] ? 'gid://shopify/Collection/' + collectionIds[7] : '',
      imageUrl: {
        selected: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/other-gifts-white.svg?v=1723095159',
        default: 'https://cdn.shopify.com/s/files/1/0101/2760/5824/files/other-gifts.svg?v=1723095160'
      },
      label: 'Other',
      labelMobile: 'Other'
    }
  ] : [];

  function ProductOfferList({ products, i18n, adding, handleAddToCart, showError, getLineIds }) {
    const chunkedProducts = chunkArray(products, 3);

    return (
      <s-stack>
        {chunkedProducts.map((productChunk, index) => (
          <ProductOfferRow
            key={index}
            products={productChunk}
            i18n={i18n}
            adding={adding}
            handleAddToCart={handleAddToCart}
            showError={showError}
            getLineIds={getLineIds}
          />
        ))}
      </s-stack>
    );
  }

  function ProductOfferRow({ products, i18n, adding, handleAddToCart, showError, getLineIds }) {
    return (
      <s-stack gap='small'>
        {products.map(product => (
          <ProductOffer
          key={product.id}
          product={product}
          i18n={i18n}
          adding={adding}
          handleAddToCart={handleAddToCart}
          showError={showError}
          getLineIds={getLineIds}
        />
        ))}
      </s-stack>
    );
  }

  function ProductOffer({ product, i18n, adding, handleAddToCart, showError, getLineIds }) {

    const { images, title, variants, id, tags } = product;
    const renderPrice = i18n.formatCurrency(variants.nodes[0].price.amount);
    const isAvailable = variants.nodes[0].availableForSale;
    const imageUrl =
      images.nodes[0]?.url ??
      'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_medium.png?format=webp&v=1530129081';

    const lineItemsIds = getLineIds();
    let btnText = "Add to cart";
    if (lineItemsIds.includes(id)) {
      btnText = "Added";
    } else if (!isAvailable) {
      btnText = "Sold out";
    } else {
      btnText = "Add to cart";
    }

    const hasRestrictedTag = tags.some(
      (tag) => tag.toLowerCase() === "restricted for " + Location_Regionname
    );

    return (
      !hasRestrictedTag &&
      <s-grid key={product.id} gridTemplateColumns={'auto 1fr auto'} alignItems={'center'} gap='base'>
        <s-grid-item background={'base'} minInlineSize="80px">
          <s-image
            src={imageUrl}
            loading={'lazy'}
            alt={title}
            objectFit={'contain'}
            sizes="60px"
          />
        </s-grid-item>
        <s-grid-item>
          <s-stack gap="small-500">
            <s-text>
              {title}
            </s-text>

            <s-text color="subdued">
              {renderPrice}
            </s-text>
          </s-stack>
        </s-grid-item>
        <s-grid-item>
          <s-button
            loading={!!adding[variants.nodes[0].id]}
            accessibilityLabel={`Add ${title} to cart`}
            onClick={() => handleAddToCart(variants.nodes[0].id)}
            tone={'neutral'}
            variant={'primary'}
            disabled={!isAvailable || btnText == "Added"}
            > {btnText == "Added" ? (
              <s-stack columnGap={'small-300'} direction='inline'>
                <s-icon tone="success" type="check-circle" />
                <s-text tone="success">{btnText}</s-text>
              </s-stack>
            ) : 
            <s-text>{btnText}</s-text>
            }
          </s-button>
        </s-grid-item>
        {showError && <ErrorBanner />}
      </s-grid>
    );

  }

  function chunkArray(array, size) {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  }

  function ErrorBanner() {
    return (
      <s-banner tone='critical'>
        There was an issue adding this product. Please try again.
      </s-banner>
    );
  }

  return (
    showAddonBlock &&
    <s-stack gap="small" padding={'large none'}>
      {addon_title &&
      <s-stack gap='large' paddingBlockEnd="small-100">
        <s-heading accessibilityRole="presentation">{ addon_title } Add something</s-heading>
        <s-divider></s-divider>
      </s-stack>
      }
      <s-grid display="none" gridTemplateColumns={'33.33% 33.33% 33.33% 33.33%'} alignContent="end">
        {addonsData.map(({ tabId, collectionId, imageUrl, label, labelMobile }) => (
          collectionId != "" && (
          <s-button
            key={tabId}
            variant="primary"
            tone={selectedTab === tabId ? 'critical' : 'auto'}
            onClick={() => {
              setSelectedTab(tabId);
              setCollectionId(collectionId);
            }}
          >
            <s-stack gap={'small-400'}>
                <s-box minInlineSize={'30px'}>
                  <s-image
                    src={selectedTab === tabId ? imageUrl.selected : imageUrl.default}
                    loading={'lazy'}
                    objectFit={'contain'}
                  />
                </s-box>
              <s-box>
                <s-text>{label}</s-text>
              </s-box>
              <s-box>
                <s-text>{labelMobile}</s-text>
              </s-box>
            </s-stack>
          </s-button>
          )
        ))}
 
      </s-grid>
      <ProductOfferList
        products={products}
        i18n={i18n}
        adding={adding}
        handleAddToCart={handleAddToCart}
        showError={showError}
        getLineIds={getLineIds}
      />
    </s-stack>
  )
}
