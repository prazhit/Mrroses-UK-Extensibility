import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useState, useEffect} from "preact/hooks";

import {
  useAttributeValues,
} from '@shopify/ui-extensions/checkout/preact';

export default async () => {
  render(<Extension />, document.body)
};


function Extension() {
  const [selectedDate, setSelectedDate] = useState("");
  const [DeliveryDate, PickupDate, Type, GiftMsg] = useAttributeValues(['Delivery-Date', 'Pickup-Date', 'Type', 'Gift-Message']);

  useEffect(() => {
    if (DeliveryDate !== "") {
      setSelectedDate(DeliveryDate);
    } else if (PickupDate !== "") {
      setSelectedDate(PickupDate);
    } 
  }, [DeliveryDate, PickupDate])

  const capitalize = (str:string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

    return(
      <s-box border={'base'} borderRadius={'base'}>
        {Type && (
          <>
            <s-grid gridTemplateColumns="1fr auto" padding={'base'} >
              <s-grid-item >
                <s-stack direction="inline" columnGap="base" rowGap="small-400">
                  <s-text color="subdued">{capitalize(Type)} Date</s-text>
                  <s-text>{selectedDate}</s-text>
                </s-stack>
              </s-grid-item>
              <s-grid-item>
                <s-link tone="auto" href={'shopify:checkout/information'} >
                  <s-text type="small">Change</s-text>
                </s-link>
              </s-grid-item>
            </s-grid>
            <s-stack padding="none base">
              <s-divider />
            </s-stack>

            <s-grid gridTemplateColumns="1fr auto" padding={'base'} >
              <s-grid-item >
                <s-stack direction="inline" columnGap="base" rowGap="small-400">
                  <s-text color="subdued">Gift Message</s-text>
                  <s-text>{GiftMsg}</s-text>
                </s-stack>
              </s-grid-item>
              <s-grid-item>
                <s-link tone="auto" href={'shopify:checkout/information'} >
                  <s-text type="small">Change</s-text>
                </s-link>
              </s-grid-item>
            </s-grid>
            <s-stack padding="none base">
              <s-divider />
            </s-stack>
          </>
        )}
    </s-box>
  )
}