import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useState, useEffect, useRef} from "preact/hooks";

import {
  useCartLines,
  useApplyCartLinesChange,
  useCartLineTarget,
  useApi,
  useBuyerJourneyIntercept
} from '@shopify/ui-extensions/checkout/preact';

export default async () => {
  render(<Extension />, document.body)
};


function Extension() {
  const [loadingLineId, setLoadingLineId] = useState(null);
  const [emptyCartLoader, setEmptyCartLoader] = useState(false);
  const [onlyAddonsInCart, setOnlyAddonsInCart] = useState(false);
  const debounceTimer = useRef(null);
  const [hideQty, setHideQty] = useState(false);
  const { id, quantity, attributes, merchandise: { product, title } } = useCartLineTarget();
  const [itemQty, setItemQty] = useState(quantity);
  const applyCartLinesChange = useApplyCartLinesChange();
  const cartLines = useCartLines();
  const [showRedirectWarning, setShowRedirectWarning] = useState<string | false>(false);
  const { query } = useApi();

  useEffect(() => {
    console.log({ cartLines });
    checkAddons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartLines]);

  useEffect(() => {
    interface ProductQueryResponse {
        product?: {
            tags?: string[];
        };
    }

    const PRODUCTID = product.id;
    const queryString = `{
      product(id: "${PRODUCTID}") {
        tags
      }
    }`;

    query(
      queryString
    )
      .then(({ data }: {data: ProductQueryResponse}) => {
        if (data.product?.tags?.includes("bogos-gift") || data.product?.tags?.includes("gm_card")) {
          setHideQty(true);
        }
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useBuyerJourneyIntercept(() => {
    const BLOCK_REASONS = [];

    if (onlyAddonsInCart) {
        return {
            behavior: 'block',
            reason: 'Only addons in cart',
            errors: [
                {
                    message: "Item in cart is not available for purchase independently. Please select one of the roses or flowers from our collection.",
                }
            ],
        };
    }

    if (BLOCK_REASONS.length > 0) {
        return {
            behavior: "block",
            reason: BLOCK_REASONS.map((r) => r.reason).join("; "),
            perform: (result) => {
            BLOCK_REASONS.forEach((r) => r.perform(result));
            },
        };
    }

    return {
    behavior: "allow"
    };
});

  const emptyCart = async (cartLines) => {
    setEmptyCartLoader(true);
    for (const line of cartLines) {
      await removeCartLineItem(line.id, line.quantity, null, null);
    }
  }

  const checkAddons = () => {
    const itemsInCart = cartLines.length;
    let addonsInCart = 0;
    cartLines.forEach((line) => {
      const productType = line.merchandise.product.productType;
      if (productType == "addon") {
        addonsInCart++;
      }
    });
    if (addonsInCart == itemsInCart) {
        setOnlyAddonsInCart(true);
    }
    const flowersInCart = itemsInCart - addonsInCart;
    if (addonsInCart >= 1 && flowersInCart <= 1) {
      cartLines.forEach((line) => {
        const productID = line.merchandise.product.id;
        const productType = line.merchandise.product.productType;
        if (productType != "addon") {
          setShowRedirectWarning(productID);
        }
      });
    } else {
      setShowRedirectWarning(false);
    }
  }

  const removeCartLineItem = async (id, quantity, productType, bundleID) => {
    setLoadingLineId(id);
    try {
      if (bundleID && productType != 'addon') {
        const matchingLines = cartLines.filter(line => {
          const bundleAttr = line.attributes.find(attr => attr.key === "Bundle ID");
          return bundleAttr && bundleAttr.value === bundleID;
        });

        for (const line of matchingLines) {
          await applyCartLinesChange({
            type: 'removeCartLine',
            id: line.id,
            quantity: line.quantity,
          });
        }
      } else {
        await applyCartLinesChange({
          type: 'removeCartLine',
          id: id,
          quantity: quantity,
        });
      }

    } catch (error) {
      console.error("Could not apply line item changes:", error);
    } finally {
      setLoadingLineId(null);
    }
  };

  const updateCartLineItem = async (id, quantity) => {
    try {
      await applyCartLinesChange({
        type: 'updateCartLine',
        id: id,
        quantity: quantity,
      });
    } catch (error) {
      console.error("Could not apply line item changes:", error);
    } finally {
      setLoadingLineId(null);
    }
  };

  const handleCartLineInput = async (id, qty, productType, bundleID) => {
    const maxQty = 40;
    setItemQty(qty);
    console.log({id, qty, productType, bundleID})
    if (qty <= 0 || qty === undefined) {
      return;
    } else if(qty > maxQty) {
        qty = maxQty;
        setItemQty(maxQty);
    }
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout( async() => {
      try {
        if (bundleID && productType != 'addon') {
            // Find all line IDs with the same Bundle ID
            const matchingLines = cartLines.filter(line => {
            const bundleAttr = line.attributes.find(attr => attr.key === "Bundle ID");
            const hasSameBundle = bundleAttr && bundleAttr.value === bundleID;
            const isRibbon = line.merchandise?.title?.toLowerCase().includes("ribbon");
            return hasSameBundle && isRibbon;
            });

            if (matchingLines.length > 0) {
                for (const line of matchingLines) {
                    await updateCartLineItem(line.id, qty);
                }
            }

        }
        await updateCartLineItem(id, qty);

        } catch (error) {
        console.error("Could not apply line item changes:", error);
        } finally {
        setLoadingLineId(null);
        }
    }, 400); 

    setLoadingLineId(id);
  };

  const bundleIdAttr = attributes.find(attr => attr.key === "Bundle ID");
  const bundleID = bundleIdAttr ? bundleIdAttr.value : null;

  return (
    <>
      <s-stack direction='inline' gap='base' padding='small-400 none'>
        {(
          !hideQty && (
            <s-stack minInlineSize='150px'>
              <s-number-field
                onChange={(e) => {
                    const qty = parseInt((e.target as HTMLInputElement).value);
                    handleCartLineInput(id, qty, product.productType, bundleID);
                }}
                min={1}
                max={40}
                controls="stepper"
                label="Quantity"
                value={itemQty.toString()}
                disabled={title?.toLowerCase().includes("ribbon") || emptyCartLoader}
              ></s-number-field>
            </s-stack>
          )
        )}

        {showRedirectWarning == product.id ? (
            <s-clickable commandFor="lineitem-popover" loading={loadingLineId === id}>
                {loadingLineId === id || emptyCartLoader ? (
                    <s-spinner size="small"></s-spinner>
                ) : (
                    <s-icon type="delete" tone="critical"></s-icon>
                )}
            </s-clickable>
        ) : (
            <s-clickable loading={loadingLineId === id || emptyCartLoader} onClick={() => removeCartLineItem(id, quantity, product.productType, bundleID)}>
                {loadingLineId === id || emptyCartLoader ? (
                    <s-spinner size="small"></s-spinner>
                ) : (
                    <s-icon type="delete" tone="critical"></s-icon>
                )}
            </s-clickable>
        )}

        <s-popover id="lineitem-popover">
            <s-stack
            maxInlineSize={'400px'}
            // padding="base"
            gap='small-200'
            >
                <s-stack gap={'small-200'}>
                    <s-text type={'strong'}>Are you sure you want to remove this item?</s-text>
                    <s-text> Removing this item will empty your cart & redirect you to the storefront.</s-text>
                </s-stack>
                <s-stack direction='inline' justifyContent='end'>
                
                    <s-clickable
                        // to={shop.storefrontUrl + '/collections/' + collectionHandle} 
                        padding='small'
                        loading={emptyCartLoader} onClick={() => emptyCart(cartLines)}>
                        <s-icon size='large-100' type="check-circle" tone="success"></s-icon>
                    </s-clickable>
                    
                    <s-clickable padding='small' commandFor="lineitem-popover" command='--hide'>
                        <s-icon size='large-100' type="x-circle" tone="critical"></s-icon>
                    </s-clickable>
                    
                </s-stack>
            </s-stack>
        </s-popover>
     
      </s-stack>
    </>
  )
}