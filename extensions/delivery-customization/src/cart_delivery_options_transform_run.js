

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").CartDeliveryOptionsTransformRunResult} CartDeliveryOptionsTransformRunResult
 */

/**
 * @type {CartDeliveryOptionsTransformRunResult}
 */
const NO_CHANGES = { operations: [] };

/**
 * @param {RunInput} input
 * @returns {CartDeliveryOptionsTransformRunResult}
 */
export function cartDeliveryOptionsTransformRun(input) {
  let formattedTime = null;
  let deliveryDate = null;
  let storeDate = null;
  let deliveryDay = null;
  let tomorrow = null;
  const deliveryGroups = input.cart?.deliveryGroups || [];
  if (!deliveryGroups.length) return NO_CHANGES;

  const selectedDate = formatDate(input.cart.calenderDate?.value);
  const storeTime = input.cart.storeTime?.value;

  if (storeTime) {
    const [dayS, dateS, timeS] = storeTime.split(", ");
    storeDate = dateS;
    // Convert and format the time
    formattedTime = convertToMilitaryTime(timeS);
    tomorrow = getTomorrow(storeDate);
  } else {
    console.log("no store time");
  }

  if (selectedDate) {
    deliveryDate = selectedDate;
    let d_date = new Date(deliveryDate);
    deliveryDay = d_date.getDay();
  }

  // Flatten all delivery options
  const allOptions = deliveryGroups.flatMap(group => group.deliveryOptions || []);

  // const zip =
  //    input.cart.deliveryGroups
  //     .filter((group) => group.deliveryAddress?.zip)
  //     .map((group) => group.deliveryAddress?.zip)[0] || null;

//  var ebzapiets_delivery = input.shop.metafield1?.value;
  // /**
  //  * @param {string | number | null} zip
  //  */
  // function get_delivery_grp(zip) {
  //   if (!zip || !ebzapiets_delivery) return "";
  //   console.log("ebzapiets_delivery", ebzapiets_delivery);
  //   console.log("zip", zip); 
  //   // Normalize incoming ZIP (remove spaces, take first 3 characters)
  //   const zipPrefix = zip.toUpperCase().replace(/\s+/g, "").slice(0, 3);
  //   console.log("zipPrefix", zipPrefix);
  //   const listRaw = ebzapiets_delivery.slice(
  //     ebzapiets_delivery.indexOf("[") + 1,
  //     ebzapiets_delivery.lastIndexOf("]")
  //   );
  //   console.log("listRaw", listRaw);
  //   // Split on commas and normalize
  //   const postcodeList = listRaw.split(",").map(p => p.trim().toUpperCase());
  //   console.log("postcodeList", postcodeList);
  //   // Check match
  //   if (postcodeList.includes(zipPrefix)) {
  //     return "delivery_1";
  //   }
  //   return ""; 
  // }

  // var delivery_grp = get_delivery_grp(zip);
  var delivery_grp = "delivery_1"; // hardcoded for testing

  console.log("delivery_grp", delivery_grp);
  // const storeDate = "11/06/2025";
  // const formattedTime = 1400;
  // const deliveryDate = "11/06/2025";
  // const deliveryDay = 5; 
  // const tomorrow = "11/07/2025";
  const delivery_option = zip_delivery_option(
    delivery_grp,
    storeDate,
    formattedTime,
    deliveryDate,
    deliveryDay,
    tomorrow
  );

  // Find matching option(s)
  // const matchingOptions = allOptions.filter(option =>
  //   option.title?.includes(KEEP_TITLE)
  // );

  const matchingOptions = allOptions.filter((option) =>
    delivery_option.some((delivery) => option.title?.includes(delivery)),
  );

  console.log("matchingOptions", matchingOptions);

  // If no matching option exists, do nothing
  // if (!matchingOptions.length) return NO_CHANGES;

  // Hide everything except the matching ones
  const operations = allOptions
    .filter(option => !matchingOptions.includes(option))
    .map(option => ({
      deliveryOptionHide: {
        deliveryOptionHandle: option.handle
      }
    }));

  console.log("operations", operations);

  return { operations };
}


function zip_delivery_option(
  delivery_grp,
  storeDate,
  formattedTime,
  deliveryDate,
  deliveryDay,
  tomorrow
) {
  let deliveryBool = [];
  if (delivery_grp == "delivery_1") {
    deliveryBool = london_delivery(storeDate, formattedTime, deliveryDate, deliveryDay, tomorrow);
  }
  else {
    deliveryBool = uk_wide_delivery(storeDate, deliveryDate, deliveryDay, formattedTime, tomorrow);
  }
  return deliveryBool;
}
  
function london_delivery(
  storeDate,
  formattedTime,
  deliveryDate,
  deliveryDay,
  tomorrow
) {
  const options = {
    sameDayAfternoon: "Same Day Service London (Afternoon Delivery)",
    sameDayNight: "Same Day Service London (Night-time Delivery)",
    deliveredMorning: "Delivered by 12pm",
  };

  const deliveryOptions = [];

  if (storeDate == deliveryDate) {
    if (formattedTime < 1500) {
      deliveryOptions.push(options.sameDayAfternoon);
    }
    deliveryOptions.push(options.sameDayNight);
    return deliveryOptions;
  }

  deliveryOptions.push(options.sameDayAfternoon, options.sameDayNight);

  if (tomorrow == deliveryDate) {
    if (formattedTime < 1700) {
      deliveryOptions.push(options.deliveredMorning);
    }
  } else {
    deliveryOptions.push(options.deliveredMorning);
  }
  return deliveryOptions;
}

function uk_wide_delivery(storeDate, deliveryDate, deliveryDay, formattedTime, tomorrow) {
  const options = {
    stdDelivery: "UK Wide Standard Delivery",
    deliveredMorning: "Delivered by 12pm",
  };

  const deliveryOptions = [];
  
  deliveryOptions.push(options.stdDelivery);

  // if (tomorrow == deliveryDate) {
  //   if (formattedTime < 1600) {
  //     deliveryOptions.push(options.deliveredMorning);
  //   }
  // } else {
  //   deliveryOptions.push(options.deliveredMorning);
  // }
  console.log("deliveryOptions", deliveryOptions);
  return deliveryOptions;
}


// --- UTILITIES ---

function formatDate(inputDate) {
  const date = new Date(inputDate);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function convertToMilitaryTime(time) {
  let [hours, minutes, seconds, period] = time.split(/[: ]/);
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  const scaledMinutes = Math.round((minutes / 60) * 100);
  return String(hours * 100 + scaledMinutes).padStart(4, "0");
}


//old code

// @ts-check
// Use JSDoc annotations for type safety
// /**
//  * @typedef {import("../generated/api").RunInput} RunInput
//  * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
//  * @typedef {import("../generated/api").Operation} Operation
//  * @typedef {import("../generated/api").ProductVariant} ProductVariant
//  */
// // The configured entrypoint for the 'purchase.delivery-customization.run' extension target
// /**
//  * @param {RunInput} input
//  * @returns {FunctionRunResult}
//  */
// export function run(input) {
//   // variable declare
//   let formattedTime = null;
//   let deliveryDate = null;
//   let storeDate = null;
//   let deliveryDay = null;
//   let tomorrow = null;
//   let delivery_option = null;

//   // extract zipcode
//   const zip =
//     input.cart.deliveryGroups
//       .filter((group) => group.deliveryAddress?.zip)
//       .map((group) => group.deliveryAddress?.zip)[0] || null;

//   // extract delivery group
//   var ebzapiets_delivery = input.shop.metafield1?.value;
//   /**
//    * @param {string | number | null} zip
//    */
//   function get_delivery_grp(zip) {
//     // @ts-ignore
//     ebzapiets_delivery = JSON.parse(ebzapiets_delivery);
//     // @ts-ignore
//     for (const group in ebzapiets_delivery) {
//       // @ts-ignore
//       zip = parseInt(zip);
//       if (ebzapiets_delivery[group].includes(zip)) {
//         return group;
//       }
//     }
//     return "";
//   }

//   var delivery_grp = get_delivery_grp(zip);

//   // extract the flower type
//   const targets = input.cart.lines
//     .filter((line) => line.merchandise.__typename === "ProductVariant")
//     .map((line) => /** @type {ProductVariant} */(line.merchandise));
 

//   // extract attribute
//   const selectedDate = formatDate(input.cart.calenderDate?.value);
//   const storeTime = input.cart.storeTime?.value;

//   if (storeTime) {
//     const [dayS, dateS, timeS] = storeTime.split(", ");
//     storeDate = dateS;
//     // Convert and format the time
//     formattedTime = convertToMilitaryTime(timeS);
//     tomorrow = getTomorrow(storeDate);
//   } else {
//     console.log("no store time");
//   }

//   if (selectedDate) {
//     deliveryDate = selectedDate;
//     let d_date = new Date(deliveryDate);
//     deliveryDay = d_date.getDay();
//   }

//   const allOptions = input.cart.deliveryGroups.flatMap(
//     (group) => group.deliveryOptions
//   );

//   delivery_option = zip_delivery_option(
//     zip,
//     delivery_grp,
//     storeDate,
//     formattedTime,
//     deliveryDate,
//     deliveryDay,
//     tomorrow
//   );

//   var firstDeliveryGroup = input.cart.deliveryGroups[0];
//   let isShipping = false;

//   for (let option of firstDeliveryGroup.deliveryOptions) {
//     if (isShippingMethod(option)) {
//       isShipping = true;
//       break;
//     }
//   }

//   const matchingOptions = allOptions.filter((option) =>
//     delivery_option.some((delivery) => option.title?.includes(delivery)),
//   );

//   const toHide = allOptions
//     .filter((option) => !matchingOptions.includes(option))
//     .map((option) => ({
//       hide: {
//         deliveryOptionHandle: option.handle,
//       },
//     }));
 
//   // Ensure valid JSON return
//   if (isShipping) {
//     return {
//       operations: [...toHide],
//     };
//   } else {
//     return {
//       operations: [],
//     };
//   }
// }

// function isShippingMethod(deliveryOption) {
//   return deliveryOption.deliveryMethodType === "SHIPPING";
// }

// const formatDate = (inputDate) => {
//   const date = new Date(inputDate);
//   const month = date.getMonth() + 1;
//   const day = date.getDate();
//   const year = date.getFullYear();
//   const formattedMonth = month.toString().padStart(2, '0');
//   const formattedDay = day.toString().padStart(2, '0');

//   return `${formattedMonth}/${formattedDay}/${year}`;
// };

// /**
//  * formates time
//  * @param time
//  */
// function convertToMilitaryTime(time) {
//   let [hours, minutes, seconds, period] = time.split(/[: ]/);

//   hours = parseInt(hours, 10);
//   minutes = parseInt(minutes, 10);

//   if (period === "PM" && hours !== 12) {
//     hours += 12;
//   } else if (period === "AM" && hours === 12) {
//     hours = 0;
//   }
//   let scaledMinutes = Math.round((minutes / 60) * 100);
//   let currentFullTime = hours * 100 + scaledMinutes;
//   return String(currentFullTime).padStart(4, "0");
// }


// }

function getTomorrow(storeDate) {
  const [month, day, year] = storeDate.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);
  const nextDay = [
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");
  return nextDay;
}