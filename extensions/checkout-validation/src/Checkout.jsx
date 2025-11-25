import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useState, useEffect, useRef} from "preact/hooks";

import {
  useCartLines,
  useApi,
  useAttributeValues,
  useShippingAddress,
  useBuyerJourneyIntercept
} from '@shopify/ui-extensions/checkout/preact';

export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  const [invalidItems, setInvalidItems] = useState([]);
  const skipUserIntercepts = useRef(false);
  const [LocationGroup] = useAttributeValues(['Location_Group']);
  const cartLines = useCartLines();
  const { zip } = useShippingAddress();
  const { query } = useApi();
  
  useEffect(() => {
    skipUserIntercepts.current = true;
    const queryString = `
    {
      ${cartLines
        .map((line, index) => {
          return `
            line${index}: product(id: "${line.merchandise.product.id}") {
              title
              tags
            }
          `;
        })
        .join("\n")} 
    }
  `;
    query(queryString)
      .then(({ data }) => {
        let restrictedWords = [];
        if (LocationGroup == "delivery_1") {
          restrictedWords.push("Restricted For London");
        } else if (LocationGroup == "delivery_2") {
          restrictedWords.push("Restricted For UK Wide");
        }
      
        const invalidSet = new Set();
        Object.values(data).forEach((product) => {
          const hasRestrictedTag = product.tags.some(tag =>
            restrictedWords.some(word =>
              tag.toLowerCase().includes(word.toLowerCase())
            )
          );
          if (hasRestrictedTag) {
            invalidSet.add(product.title);
          }
        });
        setInvalidItems(Array.from(invalidSet));
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, cartLines, zip, LocationGroup]);

  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (skipUserIntercepts.current) {
      skipUserIntercepts.current = false;
      return {
        behavior: "allow"
      }; 
    }
    const BLOCK_REASONS = [];

    if (canBlockProgress && invalidItems.length > 0) {
      return {
        behavior: 'block',
        reason: 'Invalid items in cart for selected delivery location'
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


  function formatInvalidItems(items) {
    if (!items || items.length === 0) return '';

    if (items.length === 1) {
      return `${items[0]}`;
    }

    if (items.length === 2) {
      return `${items[0]} & ${items[1]}`;
    }

    const last = items.pop();
    return `${items.join(', ')} & ${last}`;
  }
  const formattedItems = formatInvalidItems(invalidItems);
  return (
    <>
    {formattedItems && (
        <s-banner tone='critical'>{formattedItems} {invalidItems.length > 1 ? 'are' : 'is'} not available for the selected address.</s-banner>
      )}
    </>
  );

}