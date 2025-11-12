// /* eslint-disable react-hooks/exhaustive-deps */
// import '@shopify/ui-extensions/preact';
// import { render, useEffect, useState, useRef, useCallback  } from "preact";

// import {
//   useApi,
//   useApplyAttributeChange,
//   useStorage,
//   useBuyerJourneyIntercept,
//   useDeliveryGroup,
//   useDeliveryGroups,
//   useExtensionCapability,
//   useAttributeValues,
//   useCartLines,
//   useSettings,
//   useShippingAddress,
//   useApplyShippingAddressChange,
// } from '@shopify/ui-extensions/checkout/preact';

// // import useDateFunctions from './DateFunctions';

// // 1. Export the extension
// export default async () => {
//   render(<Extension />, document.body)
// };

// function Extension() {
//   const { appMetafields, ui, query } = useApi();
//   const cartLines = useCartLines();
//   const deliveryGroups = useDeliveryGroups();
//   const firstDeliveryGroup = useDeliveryGroup(deliveryGroups[0]);
//   const [selectedDate, setSelectedDate] = useState("");
//   const [showCalenderMsg, setShowCalenderMsg] = useState("");
//   const [isVdayProducts, setIsVdayProducts] = useState(false);
//   const [isMdayProducts, setIsMdayProducts] = useState(false);
//   const [remainingChars, setRemainingChars] = useState(300);
//   const [showDateField, setShowDateField] = useState(false);
//   const [formattedDate, setFormattedDate] = useState("");
//   const [canwedeliver, setCanwedeliver] = useState(true);
//   const [specialDeliveryIns, setSpecialDeliveryIns] = useState("");
//   const [giftMessage, setGiftMessage] = useState("");
//   const [residentialType, setResidentialType] = useState("");
//   const [businessName, setBusinessName] = useState("");
//   const [loadCalander, setLoadCalander] = useState(false);
//    const [currentDateFetch, setCurrentDateFetch] = useState(null);
//   const [lastFetchedTime, setLastFetchedTime] = useState(null);
//   const [metafieldLoaded, setMetafieldLoaded] = useState(false);
//   const storage = useStorage();
//   const initialRender = useRef(true);
//   const initialRender2 = useRef(true);
//   const initialRender3 = useRef(true);
//   const initialRender4 = useRef(true);
//   const initialRender5 = useRef(true);
//   const { zip, city, provinceCode, firstName, lastName, address1 } = useShippingAddress();
//   const { info_msg, valentine_dates, mothersday_dates } = useSettings();
//   const canBlockProgress = useExtensionCapability("block_progress");
//   const applyAttributeChange = useApplyAttributeChange();
//   const applyShippingAddressChange = useApplyShippingAddressChange();
//   const [GiftMsg, SpecialDeliveryInstruction, ResidenceType, DeliveryDate] = useAttributeValues(['Gift-Message', 'Special-Delivery-Instruction', 'Type of Residence', 'Delivery-Date']);
//   // const { dynamicState, checkIfDelivered, disableDates, dynamicOptions, lastDisabledDate, populateTime, del_group } = useDateFunctions();

//   const initialErrors = {
//     zipError: '',
//     dateError: '',
//     businessError: '',
//     senderNameError: '',
//     residentialError: ''
//   };

//   const [validationError, setValidationError] = useState(initialErrors);

//   const TIMEZONE_API = "https://timeapi.io/api/time/current/zone?timeZone=Australia%2FSydney";
//   const labelDate = canBlockProgress ? "Select Delivery Date" : "Select Date (optional)";

//   useEffect(() => {
//     async function getTime() {
//       setCurrentDateFetch(new Date(getTimeInTimeZone('Australia/Sydney')));
//       const fetchedTime = await fetchSydneyTime();
//       setCurrentDateFetch(fetchedTime);
//       setLastFetchedTime(new Date().getTime());
//     }
//     getTime();

//     appMetafields.subscribe((metafields) => {
//       if (metafields.length > 0) {
//         setMetafieldLoaded(true);
//       }
//     });

//     if (SpecialDeliveryInstruction) {
//       setSpecialDeliveryIns(SpecialDeliveryInstruction)
//     }

//     if (ResidenceType) {
//       setResidentialType(ResidenceType);
//     }
//     if (GiftMsg) {
//       setGiftMessage(GiftMsg);
//     }
//     if (DeliveryDate) {
//       let formatDeliveryDate = formatDate1(DeliveryDate);
//       setSelectedDate(formatDeliveryDate);
//       const date_obj = new Date(formatDeliveryDate + 'T00:00:00');
//       setFormattedDate(formatDate(date_obj));
//     }

//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     query(
//       `{
//       ${cartLines.map((line, index) => {
//         return `line${index}: product(id: "${line.merchandise.product.id}") {
//       tags
//       }`;
//       })}
//       }`
//     )
//       .then(({ data }) => {
//         const nonVdayProducts = cartLines.filter((line, i) => {
//           const product = data[`line${i}`];
//           const tags = product?.tags || [];

//           const isNonVdayProduct = !(
//             tags.includes("vday2023") ||
//             tags.includes("vdayextras") ||
//             tags.includes("free vday addons")
//           );
//           return isNonVdayProduct;
//         });

//         const allVdayTags = nonVdayProducts.length === 0;
//         setIsVdayProducts(allVdayTags);

//         // mothers day products
//         const nonMdayProducts = cartLines.filter((line, i) => {
//           const product = data[`line${i}`];
//           const tags = product?.tags || [];

//           const isNonMdayProduct = !(
//             tags.includes("mday2025") ||
//             tags.includes("mothers_day_addon")
//           );
//           return isNonMdayProduct;
//         });
//         const allMdayTags = nonMdayProducts.length === 0;
//         setIsMdayProducts(allMdayTags);
//       })
//       .catch(console.error);
//   }, [query, cartLines]);

//   useEffect(() => {
//     if (firstName) {
//       applyAttributeChange(
//         { type: 'updateAttribute', key: 'First-name-of-the-Recipient', value: firstName },
//       )
//     }
//     if (lastName) {
//       applyAttributeChange(
//         { type: 'updateAttribute', key: 'Last-name-of-the-Recipient', value: lastName },
//       )
//     }

//     if (address1) {
//       applyAttributeChange(
//         { type: 'updateAttribute', key: 'Delivery-Address-of-Recipient', value: address1 },
//       )
//     }

//     if (zip) {
//       applyAttributeChange(
//         { type: 'updateAttribute', key: 'Postal-Code', value: zip },
//       )
//     }

//     if (provinceCode && zip && city) {
//       applyAttributeChange(
//         { type: 'updateAttribute', key: 'Location', value: `${city}, ${provinceCode} ${zip}` }
//       );
//     }

//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [firstName, lastName, address1, provinceCode, zip, city])

//   useEffect(() => {
//     if (initialRender4.current) {
//       initialRender4.current = false;
//       return;
//     }

//     if (DeliveryDate) {
//       let formatDeliveryDate = formatDate1(DeliveryDate);
//       setSelectedDate(formatDeliveryDate);
//       const date_obj = new Date(formatDeliveryDate + 'T00:00:00');
//       setFormattedDate(formatDate(date_obj));
//     } else {
//       setSelectedDate("");
//     }


//     if (residentialType) {
//       handleResidentialChange(residentialType);
//     }
//     if (specialDeliveryIns) {
//       handleSpecialDeliveryIns(specialDeliveryIns)
//     }
//     if (businessName) {
//       handleBusinessname(businessName, residentialType);
//     }

//     if (address1) {
//       applyAttributeChange(
//         { type: 'updateAttribute', key: 'Delivery-Address-of-Recipient', value: address1 },
//       )
//     }
//     if (zip) {
//       applyAttributeChange(
//         { type: 'updateAttribute', key: 'Postal-Code', value: zip },
//       )
//     }

//   }, [firstDeliveryGroup?.deliveryOptions[0].type]);

//   useEffect(() => {
//     if (initialRender.current) {
//       initialRender.current = false;
//       return;
//     }

//     applyAttributeChange(
//       {
//         type: 'updateAttribute',
//         key: 'Delivery-Date',
//         value: ""
//       },
//     )
//     setSelectedDate("");
//     isValidPostalCode();

//   }, [zip, city]);

//   useEffect(() => {
//     if (metafieldLoaded) {
//       isValidPostalCode();
//     }
//   }, [metafieldLoaded])

//   useEffect(() => {
//     if (initialRender3.current) {
//       initialRender3.current = false;
//       return;
//     }
//     var region_popup = {
//       status: 'shown'
//     };
//     storage.write('region_popup', JSON.stringify(region_popup));
//   }, [])

//   const weekdayCutoff = {
//     'Monday': [10, 30],
//     'Tuesday': [10, 30],
//     'Wednesday': [10, 30],
//     'Thursday': [10, 30],
//     'Friday': [10, 30],
//     'Saturday': [8, 0],
//     'Sunday': [8, 0],
//   }

//   useBuyerJourneyIntercept(({ canBlockProgress }) => {
//     let blockReasons = [];
//     handleDateChange(selectedDate);

//     if (canBlockProgress && zip && city && provinceCode && !canwedeliver) {
//       return {
//         behavior: 'block',
//         reason: 'Invalid postal code',
//         errors: [
//           {
//             message: `We do not deliver to ${zip}`,
//             target: '$.cart.deliveryGroups[0].deliveryAddress.zip',
//           },
//           {
//             message: 'Unfortunately, the product you have selected is not eligible to deliver to your location :-( Please refer Where We Deliver or call us : 1300-677-673 for more information.'
//           }
//         ],
//       };
//     }

//     if (canBlockProgress && !isDateSet()) {
//       blockReasons.push({
//         behavior: "block",
//         reason: "Date field is required",
//         perform: (result) => {
//           if (result.behavior === "block") {
//             setValidationError((prev) => ({
//               ...prev,
//               dateError: "Please choose a delivery date."
//             }));
//           }
//         },
//       });
//     }

//     if (canBlockProgress && residentialType != "Residential House/Unit/Apartment" && !isBusinessSet()) {
//       blockReasons.push({
//         behavior: "block",
//         reason: "Business field is required",
//         perform: (result) => {
//           if (result.behavior === "block") {
//             setValidationError((prev) => ({
//               ...prev,
//               businessError: `${residentialType} name is required`
//             }));
//           }
//         },
//       });
//     }

//     if (canBlockProgress && !isResidentialTypeSet()) {
//       blockReasons.push({
//         behavior: "block",
//         reason: "Residential field is required",
//         perform: (result) => {
//           if (result.behavior === "block") {
//             setValidationError((prev) => ({
//               ...prev,
//               residentialError: "Please select an option."
//             }));
//           }
//         },
//       });
//     }

//     if (canBlockProgress &&
//       selectedDate &&
//       zip === '2570' &&
//       city
//     ) {
//       const selected = new Date(selectedDate + 'T00:00:00');
//       const selectedMonth = selected.getMonth() + 1;
//       const weekday = sydneyDateTime.weekday;
//       const [cutoffHour, cutoffMinute] = weekdayCutoff[weekday];
//       const isSameDay = selected.getFullYear() == sydneyDateTime.year &&
//         selectedMonth == sydneyDateTime.month &&
//         selected.getDate() == sydneyDateTime.day;

//       const isAfterCut =
//         sydneyDateTime.hour > cutoffHour ||
//         (sydneyDateTime.hour === cutoffHour && sydneyDateTime.minute >= cutoffMinute);

//       if (isSameDay && isAfterCut && !['oran park', 'oran'].includes(city.toLowerCase())) {
//         return {
//           behavior: 'block',
//           reason: 'Invalid postal code',
//           errors: [
//             {
//               message: `${zip} unavailable for your selected date`,
//               target: '$.cart.deliveryGroups[0].deliveryAddress.zip',
//             },
//             {
//               message: 'Unfortunately, we have just passed the cutoffs for same day delivery for your selected suburb. To proceed, please provide an alternate address or select a different date.'
//             }
//           ],
//         };
//       }
//     }

//     if (blockReasons.length > 0) {
//       return {
//         behavior: "block",
//         reason: blockReasons.map(reason => reason.reason).join('; '),
//         perform: (result) => {
//           blockReasons.forEach(reason => reason.perform(result));
//         }
//       };
//     }

//     return {
//       behavior: "allow",
//       perform: () => {
//         clearValidationErrors();
//       },
//     };
//   });

//   function isValidPostalCode() {
//     // const dowedeliver = checkIfDelivered();
//     const dowedeliver = true;
//     setCanwedeliver(dowedeliver);
//     if (zip != '' && zip != undefined && dowedeliver) {
//       setShowDateField(true);
//     } else {
//       setShowDateField(false);
//       setSelectedDate("");
//     }
//   }

//   const fetchSydneyTime = async () => {
//     try {
//       const response = await fetch(TIMEZONE_API);
//       if (!response || !response.ok) {
//         throw new Error(`Error fetching Sydney time: ${response.statusText}`);
//       }
//       const data = await response.json();
//       return new Date(data.dateTime);
//     } catch (error) {
//       console.error(error);
//       return new Date(getTimeInTimeZone('Australia/Sydney'));
//     }
//   };

//   const syncTime = () => {
//     if (lastFetchedTime && currentDateFetch) {
//       const elapsedMs = Date.now() - lastFetchedTime;
//       const currentDateMs = currentDateFetch.getTime();
//       const newTimeMs = currentDateMs + elapsedMs;
//       const newTime = new Date(newTimeMs);
//       return newTime;
//     }
//   };

//   const getDateTimePartsInTimeZone = (timeZone) => {
//     const parts = new Intl.DateTimeFormat('en-US', {
//       timeZone,
//       year: 'numeric',
//       month: '2-digit',
//       day: '2-digit',
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit',
//       hour12: false,
//       weekday: 'long',
//     }).formatToParts(new Date());

//     const result = {};
//     for (const part of parts) {
//       if (part.type !== 'literal') {
//         result[part.type] = part.value;
//       }
//     }

//     result.year = Number(result.year);
//     result.month = Number(result.month);
//     result.day = Number(result.day);
//     result.hour = Number(result.hour);
//     return result;
//   };
//   const sydneyDateTime = getDateTimePartsInTimeZone("Australia/Sydney");

//   const getTimeInTimeZone = (timeZone) => {
//     return new Intl.DateTimeFormat('en-US', {
//       timeZone,
//       year: 'numeric',
//       month: '2-digit',
//       day: '2-digit',
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit',
//       hour12: false,
//       weekday: 'long',
//     }).format(new Date());
//   };

//   const currentTimeInSydney = getTimeInTimeZone("Australia/Sydney");

//   function isDateSet() {
//     return selectedDate !== "";
//   }

//   function isBusinessSet() {
//     return businessName !== "";
//   }

//   function isResidentialTypeSet() {
//     return residentialType !== "";
//   }

//   function clearValidationErrors() {
//     setValidationError(initialErrors);
//   }


//   const handleBusinessname = (value, currentResidentialType) => {
//     setBusinessName(value);
//     applyAttributeChange(
//       {
//         type: 'updateAttribute',
//         key: 'Business Name',
//         value: value
//       },
//     )

//     if (currentResidentialType != "Residential House/Unit/Apartment") {
//       applyShippingAddressChange({
//         type: "updateShippingAddress",
//         address: {
//           company: value
//         }
//       })
//     }

//   }

//   const handleResidentialChange = (value) => {
//     setBusinessName("");
//     if (value == "Residential House/Unit/Apartment") {
//       handleBusinessname("", value);
//     }
//     setValidationError((prev) => ({
//       ...prev,
//       residentialError: "",
//       businessError: ""
//     }));
//     applyAttributeChange(
//       {
//         type: 'updateAttribute',
//         key: 'Type of Residence',
//         value: value
//       },
//     )
//   }

//   const handleSpecialDeliveryIns = (value) => {
//     applyAttributeChange(
//       {
//         type: 'updateAttribute',
//         key: 'Special-Delivery-Instruction',
//         value: value
//       },
//     )
//   }

//   const formatDate = (date) => {
//     const monthNames = [
//       "January", "February", "March", "April", "May", "June",
//       "July", "August", "September", "October", "November", "December"
//     ];
//     const year = date.getFullYear();
//     const month = monthNames[date.getMonth()];
//     const day = date.getDate();
//     return `${month} ${day}, ${year}`;
//   }

//   const formatDate1 = (dateString) => {
//     const date = new Date(dateString);
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
//     const day = String(date.getDate()).padStart(2, '0');
//     return `${year}-${month}-${day}`;
//   };

//   const formatDate2 = (date) => {
//     date = new Date(date + 'T00:00:00');
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, "0");
//     const day = String(date.getDate()).padStart(2, "0");
//     return `${year}/${month}/${day}`;
//   };


//   useEffect(() => {
//     if (initialRender5.current) {
//       initialRender5.current = false;
//       return;
//     }
//     if (selectedDate) {
     
//       setValidationError((prev) => ({
//         ...prev,
//         dateError: ""
//       }));


//       applyAttributeChange(
//         {
//           type: 'updateAttribute',
//           key: 'Delivery-Date',
//           value: selectedDate ? formatDate2(selectedDate) : ""
//         },
//       )
//       applyAttributeChange(
//         { type: 'updateAttribute', key: 'pickup-id', value: "" },
//       )
//       applyAttributeChange(
//         { type: 'updateAttribute', key: 'Pickup-Date', value: "" },
//       )
//       applyAttributeChange(
//         { type: 'updateAttribute', key: 'Pickup-Time', value: "" },
//       )
//       ui.overlay.close("datepicker");
//     }
//   }, [selectedDate]);

//   useEffect(() => {
//     if (initialRender2.current) {
//       initialRender2.current = false;
//       return;
//     }

//     setLoadCalander(false);

//     applyAttributeChange(
//       { type: 'updateAttribute', key: 'Type', value: 'delivery' },
//     )

//     applyAttributeChange(
//       { type: 'updateAttribute', key: 'storeDatetime', value: currentTimeInSydney },
//     );

//   }, [loadCalander, residentialType]);


//   const handleOnPress = () => {
   
//     // setDatesDisabled(['']);
//     setLoadCalander(true);
//   }


//   var vdayRanges = (typeof valentine_dates === "string" && valentine_dates)
//     ? valentine_dates.split(", ")
//     : ["2026-02-11", "2026-02-12", "2026-02-13", "2026-02-14", "2026-02-15"];

//   var mdayRanges = (typeof mothersday_dates === "string" && mothersday_dates)
//     ? mothersday_dates.split(", ")
//     : ["2025-05-08", "2025-05-09", "2025-05-10", "2025-05-11"];

//   const handleDateChange = useCallback((selectedDate) => {

//     var isDateInVday = false;
//     var isDateInMday = false;
//     if (vdayRanges.includes(selectedDate)) {
//       isDateInVday = vdayRanges.includes(selectedDate);
//     } else if (mdayRanges.includes(selectedDate)) {
//       isDateInMday = mdayRanges.includes(selectedDate);
//     }

//     if (isDateInVday && !isVdayProducts) {
//       setSelectedDate('');
//       setShowCalenderMsg("vday");
//     } else if (isDateInMday && !isMdayProducts) {
//       setSelectedDate('');
//       setShowCalenderMsg("mday");
//     } else {
//       setShowCalenderMsg("");
//       setSelectedDate(selectedDate);
//     }

//     const date_obj = new Date(selectedDate + 'T00:00:00');
//     setFormattedDate(formatDate(date_obj));
//   }, [isVdayProducts, isMdayProducts]);


//   return (
//     <>
//       {info_msg &&
//         <s-banner 
//         // tone={shopify.settings.value.banner_status}
//         >
//           <s-text type={'mark'}>{info_msg}</s-text>
//         </s-banner>
//       }

//       <s-select
//         name="Select what to do if no one is at home"
//         label="Select what to do if no one is at home"
//         value={specialDeliveryIns}
//         onChange={(value) => {
//           setSpecialDeliveryIns(`${value}`);
//           handleSpecialDeliveryIns(value);
//         }}
//       >
//         <s-option value="">Select what to do if no one is at home</s-option>
//         <s-option value="Leave it at the reception">Leave it at the reception</s-option>
//         <s-option value="Leave it at the door">Leave it at the door</s-option>
//         <s-option value="Leave with neighbour">Leave with neighbour</s-option>
//       </s-select>


//       <s-text-area
//         name="Gift Message"
//         maxLength={300}
//         onChange={(value) => {
//           setGiftMessage(`${value}`);
//           applyAttributeChange({
//             type: 'updateAttribute',
//             key: 'Gift-Message',
//             value: `${value}`
//           })
//         }}
//         onInput={(value) => {
//           if (value.length <= 300) {
//             setRemainingChars(300 - value.length);
//           }
//         }}
//         value={giftMessage}
//         label="Gift Message"
//         error=""></s-text-area>
//       <s-text type={'small'} color={'subdued'}>{remainingChars} Character(s) Remaining !</s-text>

//       {showDateField && (
//         <>
//           <s-clickable
//             blockSize="auto"
//             onClick={handleOnPress}
//           >
//             <s-text-field autocomplete={"off"}
//               required={canBlockProgress} label={labelDate} error={validationError.dateError} value={selectedDate ? formattedDate : ""}></s-text-field>
//           </s-clickable>

//           <s-modal id="datepicker" >
//             <s-stack justifyContent="center">
//               <s-text color={'subdued'} type={'mark'}>Please select the available date</s-text>
//             </s-stack>
//             <s-date-picker onChange={handleDateChange} disabled={true} ></s-date-picker>

//             {selectedDate && (
//               <>
//                 <s-stack justifyContent="center">
//                   <s-text>{selectedDate ? 'Selected Date: ' + formattedDate : ''}</s-text>
//                 </s-stack>

//               </>
//             )}

//           </s-modal>
//         </>
//       )}
//     </>
//   );
// }
