import '@shopify/ui-extensions/preact';
import {render} from "preact";

import {
  useSettings
} from '@shopify/ui-extensions/checkout/preact';

export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  
  const { review_title, review_content, review_button_text } = useSettings();

  return (
     <>
      <s-stack border="base" padding="base" gap='large' borderRadius="base">
        <s-heading>{review_title}</s-heading>
        <s-text type="emphasis">{review_content}</s-text>
        {review_button_text && (
         <s-stack direction="inline" maxBlockSize={'100px'} justifyContent="end">
          <s-button tone="auto" variant='primary' href="https://search.google.com/local/writereview?placeid=ChIJg6ByzU1zdkgRSWDqR_GCn-U" target="_blank">
            {review_button_text}
          </s-button>
         </s-stack>
        )}
      </s-stack>
    </>
  );

}