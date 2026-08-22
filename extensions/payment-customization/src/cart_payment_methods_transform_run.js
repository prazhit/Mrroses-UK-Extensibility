// @ts-check
import { PaymentCustomizationPaymentMethodPlacement } from "../generated/api";
/**
 * @typedef {import("../generated/api").CartPaymentMethodsTransformRunInput} CartPaymentMethodsTransformRunInput
 * @typedef {import("../generated/api").CartPaymentMethodsTransformRunResult} CartPaymentMethodsTransformRunResult
 */

/**
 * @type {CartPaymentMethodsTransformRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

/**
 * @param {CartPaymentMethodsTransformRunInput} input
 * @returns {CartPaymentMethodsTransformRunResult}
 */
export function cartPaymentMethodsTransformRun(input) {
  const acceleratedCheckout =
    PaymentCustomizationPaymentMethodPlacement.AcceleratedCheckout;

  const operations = input.paymentMethods

    .filter((method) => method.placements.includes(acceleratedCheckout))
    .map((method) => ({
      paymentMethodHide: {
        paymentMethodId: method.id,

        placements: [acceleratedCheckout],
      },
    }));

  return operations.length > 0 ? { operations } : NO_CHANGES;
}