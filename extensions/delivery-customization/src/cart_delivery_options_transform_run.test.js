// /**
//  * @typedef {import("../generated/api").RunInput} RunInput
//  * @typedef {import("../generated/api").CartDeliveryOptionsTransformRunResult} CartDeliveryOptionsTransformRunResult
//  */

// /**
//  * @type {CartDeliveryOptionsTransformRunResult}
//  */
// const NO_CHANGES = { operations: [] };

// /**
//  * @param {RunInput} input
//  * @returns {CartDeliveryOptionsTransformRunResult}
//  */
// export function cartDeliveryOptionsTransformRun(input) {
//   let formattedTime = null;
//   let deliveryDate = null;
//   let storeDate = null;
//   let deliveryDay = null;
//   let tomorrow = null;
//   let delivery_option = null;

//   // Extract zip
//   const zip =
//     input.cart?.deliveryGroups
//       ?.filter((group) => group.deliveryAddress?.zip)
//       .map((group) => group.deliveryAddress?.zip)[0] ?? null;

//   // Extract metafield (same key, update if needed)
//   let ebzapiets_delivery = input.shop?.metafield1?.value;
//   if (!ebzapiets_delivery) return NO_CHANGES;

//   /**
//    * @param {string | number | null} zip
//    */
//   function get_delivery_grp(zip) {
//     let obj = {};
//     try { obj = JSON.parse(ebzapiets_delivery); } catch(e) { return ""; }
//     zip = parseInt(zip);

//     for (const group in obj) {
//       if (obj[group].includes(zip)) return group;
//     }
//     return "";
//   }

//   const delivery_grp = get_delivery_grp(zip);

//   // Extract variant list
//   const targets = input.cart?.lines
//     ?.filter((line) => line.merchandise.__typename === "ProductVariant")
//     .map((line) => line.merchandise);

//   // Extract attributes
//   const selectedDate = formatDate(input.cart?.calenderDate?.value);
//   const storeTime = input.cart?.storeTime?.value;

//   if (storeTime) {
//     const [dayS, dateS, timeS] = storeTime.split(", ");
//     storeDate = dateS;
//     formattedTime = convertToMilitaryTime(timeS);
//     tomorrow = getTomorrow(storeDate);
//   }

//   if (selectedDate) {
//     deliveryDate = selectedDate;
//     const d_date = new Date(deliveryDate);
//     deliveryDay = d_date.getDay();
//   }

//   const deliveryGroups = input.cart?.deliveryGroups || [];
//   if (!deliveryGroups.length) return NO_CHANGES;

//   const allOptions = deliveryGroups.flatMap(group => group.deliveryOptions);

//   delivery_option = zip_delivery_option(
//     zip,
//     delivery_grp,
//     storeDate,
//     formattedTime,
//     deliveryDate,
//     deliveryDay,
//     tomorrow
//   );

//   const firstDeliveryGroup = deliveryGroups[0];
//   let isShipping = firstDeliveryGroup.deliveryOptions.some(
//     (option) => option.deliveryMethodType === "SHIPPING"
//   );

//   const matchingOptions = allOptions.filter((option) =>
//     delivery_option.some((delivery) => option.title?.includes(delivery)),
//   );

//   const toHide = allOptions
//     .filter((option) => !matchingOptions.includes(option))
//     .map((option) => ({
//       deliveryOptionHide: {
//         deliveryOptionHandle: option.handle,
//       },
//     }));

//   if (isShipping) {
//     return { operations: toHide };
//   } else {
//     return NO_CHANGES;
//   }
// }


// // --- UTILITIES ---

// function formatDate(inputDate) {
//   const date = new Date(inputDate);
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const day = String(date.getDate()).padStart(2, '0');
//   const year = date.getFullYear();
//   return `${month}/${day}/${year}`;
// }

// function convertToMilitaryTime(time) {
//   let [hours, minutes, seconds, period] = time.split(/[: ]/);
//   hours = parseInt(hours, 10);
//   minutes = parseInt(minutes, 10);

//   if (period === "PM" && hours !== 12) hours += 12;
//   if (period === "AM" && hours === 12) hours = 0;

//   const scaledMinutes = Math.round((minutes / 60) * 100);
//   return String(hours * 100 + scaledMinutes).padStart(4, "0");
// }
