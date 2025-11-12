import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useState, useEffect} from "preact/hooks";

import {
  useAttributeValues,
  useApplyAttributeChange,
  useBuyerJourneyIntercept
} from '@shopify/ui-extensions/checkout/preact';

export default async () => {
  render(<Extension />, document.body)
};


function Extension() {
    const [senderNumber, setSenderNumber] = useState('');
    const applyAttributeChange = useApplyAttributeChange();
    const [SenderNumber] = useAttributeValues(['Sender Number']);
    const initialValidationState = {
        senderErr: "",
    }
    const [validationError, setValidationError] = useState(initialValidationState);

    type BuyerJourneyStepResult = { behavior: "allow" | "block" };
    type BlockReason = {
        behavior: "block";
        reason: string;
        perform: (result: BuyerJourneyStepResult) => void;
    };

    useBuyerJourneyIntercept(({ canBlockProgress }) => {
    const BLOCK_REASONS: BlockReason[] = [];

    if (canBlockProgress && !isSenderNumberSet()) {
      BLOCK_REASONS.push({
        behavior: "block",
        reason: "Sender number is required",
        perform: (result) => {
          if (result.behavior === "block") {
            setValidationError((prev) => ({
              ...prev,
              senderErr: "Your phone number is required"
            }));
          }
        },
      });
    }

    if (BLOCK_REASONS.length > 0) {
      return {
        behavior: "block",
        reason: BLOCK_REASONS.map(reason => reason.reason).join('; '),
        perform: (result) => {
          BLOCK_REASONS.forEach(reason => reason.perform(result));
        }
      };
    }

    return {
      behavior: "allow",
      perform: () => {
        clearValidationErrors();
      },
    };
  });

  const clearValidationErrors = () => {
    setValidationError(initialValidationState);
  }

  const isSenderNumberSet = () => {
    return senderNumber !== "";
  }

  const handleSenderNumber = (e: Event) => {
    const val = (e.target as HTMLInputElement)?.value;
    setSenderNumber(val);
    setValidationError((prev) => ({
      ...prev,
      senderErr: ""
    }));
    applyAttributeChange(
      { type: 'updateAttribute', key: 'Sender Number', value: val },
    )
  }

  useEffect(() => {
    if (SenderNumber) {
      setSenderNumber(SenderNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


    return(
        <s-stack>
            <s-phone-field label='Your Phone Number (Required)' error={validationError.senderErr} required={true} value={senderNumber} onChange={handleSenderNumber} ></s-phone-field>
        </s-stack>
    )
}