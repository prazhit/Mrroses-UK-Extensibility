import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useState, useEffect, useRef} from "preact/hooks";

import {
  useAttributeValues,
  useApplyAttributeChange,
  useBuyerJourneyIntercept,
  useAppMetafields,
  useDeliveryGroup,
  useDeliveryGroups,
  useShippingAddress,
} from '@shopify/ui-extensions/checkout/preact';

export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  const [specialDeliveryIns, setSpecialDeliveryIns] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [remainingChars, setRemainingChars] = useState(300);
  const [selectedDate, setSelectedDate] = useState("");
  const [lastDisabledDate, setLastDisabledDate] = useState("");
  const [currentDeliveryGroup, setCurrentDeliveryGroup] = useState("");
  const [showDateField, setShowDateField] = useState(false);
  const [canUseMetafields, setCanUseMetafields] = useState(false);
  const [dateErrMsg, setDateErrMsg] = useState("");
  const [disallowedDates, setDisallowedDates] = useState("");
  const [formattedDate, setFormattedDate] = useState("");
  const [currentDate, setCurrentDate] = useState(null);
  const [lastFetchedTime, setLastFetchedTime] = useState(null);
  const modalRef = useRef(null);
  const isMountedRef = useRef(true);

  const initialValidationState = {
    zipError: "",
    dateError: dateErrMsg,
    businessError: "",
    senderNameError: "",
    residentialError: ""
  }

  const [validationError, setValidationError] = useState(initialValidationState);

  const metafields = useAppMetafields();
  const applyAttributeChange = useApplyAttributeChange();
  const shippingAddress = useShippingAddress(); 
  const deliveryGroups = useDeliveryGroups();
  const firstDeliveryGroup = useDeliveryGroup(deliveryGroups[0]);
  const selectedDeliveryOption = firstDeliveryGroup?.selectedDeliveryOption;
  const [GiftMsg, SpecialDeliveryInstruction, Type] = useAttributeValues(['Gift-Message', 'Special-Delivery-Instruction', 'Type']);
  const timezone = "Europe/London";
  const TIMEZONE_API = "https://mrwildflowers.com.au/uk/getapi/webhook/synctime?timeZone=" + timezone;
  const { zip, firstName, lastName, address1 } = shippingAddress;

  useEffect(() => {

    async function getTime() {
      try {
        setCurrentDate(new Date(getTimeInTimeZone(timezone)));
        const fetchedTime = await fetchUKTime();
        if (fetchedTime) {
          setCurrentDate(fetchedTime);
          setLastFetchedTime(Date.now());
        }
      } catch (err) {
        console.error("Error in getTime:", err);
      }
    }
      
    if (SpecialDeliveryInstruction) {
      setSpecialDeliveryIns(SpecialDeliveryInstruction)
    }
    if (GiftMsg) {
      setGiftMessage(GiftMsg);
    }

    getTime();

    return () => {
      isMountedRef.current = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canUseMetafields) {
      runDateFunctions();
    }
    updateStoreDateTime();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseMetafields, currentDate, zip])

  useEffect(() => {
    if (firstName) {
      applyAttributeChange(
        { type: 'updateAttribute', key: 'First-name-of-the-Recipient', value: firstName },
      )
    }
    if (lastName) {
      applyAttributeChange(
        { type: 'updateAttribute', key: 'Last-name-of-the-Recipient', value: lastName },
      )
    }

    if (address1) {
      applyAttributeChange(
        { type: 'updateAttribute', key: 'Delivery-Address-of-Recipient', value: address1 },
      )
    }

    if (zip) {
      applyAttributeChange(
        { type: 'updateAttribute', key: 'Postal-Code', value: zip },
      )
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, address1, zip])

  useEffect(() => {
    updateStoreDateTime();

    const attributesToUpdate = [
      { key: 'Type', value: 'delivery' },
      { key: 'Delivery-Date', value: selectedDate ? formatDate2(selectedDate) : '' },
      { key: 'Location_Group', value: currentDeliveryGroup },
      { key: 'Pickup-Date', value: '' },
      { key: 'Pickup-Time', value: '' },
      { key: 'pickup-id', value: '' },
      { key: 'Postal-Code', value: '' },
    ];

    attributesToUpdate.forEach(({ key, value }) => {
      applyAttributeChange({
        type: 'updateAttribute',
        key,
        value,
      });
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    if (Type === "pickup") {
      setSelectedDate("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeliveryOption?.type])

  useEffect(() => {
    if (metafields.length > 0) {
      setCanUseMetafields(true);
    } else {
      setCanUseMetafields(false);
      console.log('Waiting for metafields to load...');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metafields]);

  type BuyerJourneyStepResult = { behavior: "allow" | "block" };
  type BlockReason = {
    behavior: "block";
    reason: string;
    perform: (result: BuyerJourneyStepResult) => void;
  };

  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    console.log("USER BUYER JOURNERY CALLED")
    const BLOCK_REASONS: BlockReason[] = [];

    if (canBlockProgress && !dateValidation()) {
      BLOCK_REASONS.push({
        behavior: "block",
        reason: "Date field is required",
        perform: (result) => {
          if (result.behavior === "block" && isMountedRef.current) {
            setValidationError((prev) => ({
              ...prev,
              dateError: dateErrMsg,
            }));
          }
        },
      });
    }

    if (BLOCK_REASONS.length > 0) {
      return {
        behavior: "block" as const,
        reason: BLOCK_REASONS.map((r) => r.reason).join("; "),
        perform: (result: BuyerJourneyStepResult) => {
          if (isMountedRef.current) {
            BLOCK_REASONS.forEach((r) => r.perform(result));
          }
        },
      };
    }

    return {
      behavior: "allow" as const,
      perform: () => {
        if (isMountedRef.current) clearValidationErrors();
      },
    };
  });


  const clearValidationErrors = () => {
    console.log("VALIDATION CLEARED")
    setValidationError(initialValidationState);
  }

  const dateValidation = () => {
    if (!selectedDate) {
      setDateErrMsg("Please choose a delivery date.");
      return false;
    }
    if (selectedDate && lastDisabledDate){
      const selectedDateObj = new Date(selectedDate);
      const lastDisabledDateObj = new Date(lastDisabledDate);
      const allDisabledDates = disallowedDates
      .split(",")
      .map(d => d.replace(/[-\s]/g, ""))
      .map(d => d.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));
      if (selectedDateObj < lastDisabledDateObj || allDisabledDates.includes(selectedDate)){
        setDateErrMsg("Selected date is invalid. Please choose another delivery date.");
        return false;
      }
    }
    setDateErrMsg("");
    return true;
  }

  const handleDateChange = (e: Event & {currentTarget: HTMLInputElement}) => {
    const SELECTED_DATE = e.currentTarget.value;
    setSelectedDate(SELECTED_DATE);
    const DATE_OBJ = new Date(SELECTED_DATE + 'T00:00:00');
    setFormattedDate(formatDate(DATE_OBJ));
    setDateErrMsg("");
    
    if (modalRef.current && typeof modalRef.current.hideOverlay === 'function') {
      modalRef.current.hideOverlay();
    }
    
  };

  const updateStoreDateTime = () => {
    const syncedTime = syncTime();
    const dt = syncedTime?.toString();
    const currentDateTime = formatToReadableDate(dt);
    applyAttributeChange({
      type: 'updateAttribute',
      key: 'storeDatetime',
      value: currentDateTime
    });
  }

  const runDateFunctions = () => {
    let dateTimeNow = currentDate;
    const syncedTime = syncTime();
    if (syncedTime) {
      dateTimeNow = syncedTime;
    }
    const currentDateTime = formatToReadableDate(dateTimeNow);
    const {disabled_dates, current_delivery_grp, last_disabled_date} = DateFunctions(metafields, shippingAddress, currentDateTime);
    setLastDisabledDate(last_disabled_date);
    const disableDatesStr = [...disabled_dates];
    const lastDisabledDate = "--" + last_disabled_date;
    disableDatesStr.push(lastDisabledDate);
    setDisallowedDates(disableDatesStr.join(','));
    setCurrentDeliveryGroup(current_delivery_grp);
    if (current_delivery_grp !== "") {
      setShowDateField(true);
    } else {
      setShowDateField(false);
    }
    console.log({currentDateTime, current_delivery_grp, last_disabled_date});

  }

  const getTimeInTimeZone = (timeZone) => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      weekday: 'long',
    }).format(new Date());
  }

  const syncTime = () => {
    if (lastFetchedTime && currentDate) {
      const elapsedMs = Date.now() - lastFetchedTime;
      const datePart = currentDate.split(", ")[0];
      const timeOnly = currentDate.split(", ")[1]; 
      const [day, month, year] = datePart.split("/");
      const isoString = `${year}-${month}-${day}T${timeOnly}`;
      const baseDate = new Date(isoString);
      const newTimeMs = baseDate.getTime() + elapsedMs;
      const newTime = new Date(newTimeMs);
      return newTime;
    } else {
      return null;
    }
  };

  const formatToReadableDate = (dateString: string) => {
    const date = new Date(dateString);
    const offsetInMs = (5 * 60 + 45) * 60 * 1000;
    const adjustedDate = new Date(date.getTime() + offsetInMs);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[adjustedDate.getUTCDay()];
    const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getUTCDate()).padStart(2, '0');
    const year = adjustedDate.getUTCFullYear();
    const hours = String(adjustedDate.getUTCHours()).padStart(2, '0');
    const minutes = String(adjustedDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(adjustedDate.getUTCSeconds()).padStart(2, '0');

    return `${dayName}, ${month}/${day}/${year}, ${hours}:${minutes}:${seconds}`;
  }

  const fetchUKTime = async () => {
    try {
      const response = await fetch(TIMEZONE_API);
      if (!response || !response.ok) {
        throw new Error(`Error fetching time: ${response.statusText}`);
      }
      const data = await response.json();
      const newDateTime = new Date(data.dateTime).toLocaleString("en-GB", {
        timeZone: timezone
      });
      return newDateTime;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const showDatePicker = () => {
    if (canUseMetafields) {
      runDateFunctions();
    }
  }

  const handleSpecialDeliveryIns = (e: Event & { currentTarget: HTMLSelectElement }) => {
    setSpecialDeliveryIns(e.currentTarget.value);
    applyAttributeChange(
      {
        type: 'updateAttribute',
        key: 'Special-Delivery-Instruction',
        value: e.currentTarget.value
      },
    )
  };

  const handleGiftMsg = (e: Event & { currentTarget: HTMLTextAreaElement }) => {
    setGiftMessage(e.currentTarget.value);
    applyAttributeChange(
      {
        type: 'updateAttribute',
        key: 'Gift-Message',
        value: e.currentTarget.value
      },
    )
  };

  const handleGiftInput = (e: Event & { currentTarget: HTMLInputElement }) => {
    const GIFT_VAL = e.currentTarget.value;
    if (GIFT_VAL.length <= 300) {
      setRemainingChars(300 - GIFT_VAL.length);
    }
  };

  const formatDate = (date) => {
    const MONTH_NAMES = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const YEAR = date.getFullYear();
    const MONTH = MONTH_NAMES[date.getMonth()];
    const DAY = date.getDate();
    return `${MONTH} ${DAY}, ${YEAR}`;
  };

  const formatDate2 = (date) => {
    const DATE = new Date(date + 'T00:00:00');
    const YEAR = DATE.getFullYear();
    const MONTH = String(DATE.getMonth() + 1).padStart(2, "0");
    const DAY = String(DATE.getDate()).padStart(2, "0");
    return `${YEAR}/${MONTH}/${DAY}`;
  };

  return (
    <>
      <s-stack gap='base'>
        <s-select
          name="Select what to do if no one is at home"
          label="Select what to do if no one is at home"
          value={specialDeliveryIns}
          onChange={handleSpecialDeliveryIns}
        >
          <s-option value="">Select what to do if no one is at home</s-option>
          <s-option value="Leave it at the reception">Leave it at the reception</s-option>
          <s-option value="Leave it at the door">Leave it at the door</s-option>
          <s-option value="Leave with neighbour">Leave with neighbour</s-option>
        </s-select>

        <s-grid alignContent='end' gap='small-400'>
          <s-grid-item>
            <s-text-area
              name="Gift Message"
              maxLength={300}
              onChange={handleGiftMsg}
              onInput={handleGiftInput}
              value={giftMessage}
              label="Gift Message"
              rows={5}
              error=""></s-text-area>
          </s-grid-item>
          <s-grid-item>
            <s-text type="small">
            <s-text type={'offset'} color={'subdued'}>{remainingChars} Character(s) Remaining !</s-text>
            </s-text>
          </s-grid-item>
        </s-grid>

        { showDateField && (
          <s-clickable command='--show' commandFor="delivery-datepicker">
            <s-text-field icon='calendar' label='Select Delivery Date' error={validationError.dateError} required={true} value={selectedDate && formattedDate} ></s-text-field>
          </s-clickable>
        )}
        
      </s-stack>

      <s-modal id="delivery-datepicker" onShow={showDatePicker} ref={modalRef}>
        <s-stack gap='large-300' justifyContent='center' paddingBlockEnd='large'>
          <s-stack direction="inline" justifyContent='center'>
            <s-text type='strong' color='subdued'>
            Please select the available date
          </s-text>
          </s-stack>
          <s-date-picker
            onChange={handleDateChange}
            value={selectedDate || ""}
            defaultValue= {selectedDate || ""}
            disallow={disallowedDates}
          ></s-date-picker>

          {selectedDate && (
          <s-stack direction="inline" gap='small-300' justifyContent='center'>
            <s-text>Selected Date:</s-text>
            <s-time dateTime={selectedDate}>{formattedDate}</s-time>
          </s-stack>
          )}

        </s-stack>
      </s-modal>

    </>
  );

}


const DateFunctions = (metafields, shippingAddress, currentDateTime) => {
  const appMetafields = metafields;
  const { zip } = shippingAddress;
  
  const disabled_dates = [];
  let current_delivery_grp = '';
  let last_disabled_date = '';

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatDate(date) {
    date = typeof date === 'object' ? date : new Date(date.replace(/-/g, '/')); 
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so we add 1
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function getDescendantProp(obj, desc) {
    const arr = desc.split(".");
    while (arr.length && (obj = obj[arr.shift()]));
    return obj;
  }

  function populate_date(method_name, selected_location) {
    const blackout_dates = selected_location.blackout;
    blackout_dates?.forEach((date) => {
      const disable_date = formatDate(date);
      disabled_dates.push(disable_date);
    })      

    const weekday = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
    ];

    if (method_name == "delivery") {
        const days_list = selected_location?.slot;
        for (const day in weekday) {
            const dd = weekday[day] + '_disable';
            if (days_list[dd] == 1) {
                const disable_day = weekday[day];
                disabled_dates.push(capitalize(disable_day));
            }
        }
    }
  }

  function get_delivery_grp(selected_location, zip) {
    let postal_code_found = 0;
    const delivery_postalcode = zip;
    let delivery_grp = "";
    for (const i in selected_location) {
      if (selected_location[i].enable_delivery && selected_location[i].offset) {
        const single_delivery = selected_location[i];
        const postcode_string = single_delivery.zipcode?.zip_codes;
        const postcode_array = postcode_string?.split(",");
        const postal_codeLower = delivery_postalcode?.toLowerCase();

        if (
            single_delivery.zipcode?.validation_type == 1 &&
            postal_code_found == 0
        ) {
            for (const postcode in postcode_array) {
                const single_value_trim = postcode_array[postcode].trim();
                if (single_value_trim) {
                    const singleValueLower = single_value_trim?.toLowerCase();
                    if (postal_codeLower == singleValueLower) {
                        delivery_grp = i;
                        postal_code_found = 1;
                        break;
                    }
                }
            }
        } else if (single_delivery.zipcode?.validation_type == 2) {
            for (const postcode in postcode_array) {
               const single_value_trim = postcode_array[postcode].trim();
                if (single_value_trim) {
                   const singleValueLower = single_value_trim?.toLowerCase();
                    if (postal_codeLower?.indexOf(singleValueLower) == 0) {
                        delivery_grp = i;
                        postal_code_found = 1;
                        break;
                    }
                }
            }
        }
      }
    }
    return delivery_grp;
    }

  function offsetdata(method_name, delivery_group) {
    if (method_name) {
      let selected_location;
      if (method_name == "delivery") {

          const locationArr: string[] = [];
          appMetafields.forEach((metadata) => {
              if (metadata.metafield.key == method_name) {
                  locationArr.push(metadata.metafield.value);
              }
          })
          const storepick_data = JSON.parse(locationArr[0] || '{}');

          selected_location = getDescendantProp(
              storepick_data,
              delivery_group
          );
      }

      const dateTimeParts = currentDateTime.split(', ');
      const timeParts = dateTimeParts[2].split(':');
      const current_hour = parseInt(timeParts[0], 10);
      const current_minutes = parseInt(timeParts[1], 10);
      const day_name = dateTimeParts[0]?.toLowerCase();
      const selected_offset = selected_location.offset;
      const selected_offset_day = getDescendantProp(selected_offset, day_name);
      // const region_name = selected_location.regionname;
      const current_full_time = current_hour * 100 + (current_minutes / 60) * 100;

      populate_date(method_name, selected_location);

      let push_day = 0;
      if (selected_offset_day.before) {
        push_day = selected_offset_day.before;
      }

      if (selected_offset_day.enable_breakpoint) {
          const break_point_val = selected_offset_day.breakpoint;
          const nextday_breakpoint = selected_offset_day.nextday_breakpoint;
          // if next day breakpoint is enabled
          if (selected_offset_day.enable_nextday_breakpoint) {
              //if after regular breakpoint and before nextday breakpoint
              if (
                  current_full_time >= break_point_val &&
                  current_full_time <= nextday_breakpoint
              ) {
                  const before_cutoff_day = selected_offset_day.before;
                  const next_day_value = 1;
                  push_day = +before_cutoff_day + +next_day_value;
              }
              //if after nextday breakpoint
              if (current_full_time >= nextday_breakpoint) {
                  push_day = selected_offset_day.after;
              }
          }
          //if no nextday breakpoint is enabled
          else {
              if (current_full_time >= break_point_val) {
                  push_day = selected_offset_day.after;
              }
          }
      }
      if (push_day == 0) {
          if ((method_name == "delivery")) {
            const selected_days = selected_location?.slot;
            const selected_time_day = getDescendantProp(selected_days, day_name);
            let found = false;
            if (selected_time_day) {
                for (const index_off in selected_time_day) {
                    const end_time = selected_time_day[index_off].end;
                    const end_hrs = Math.floor(end_time / 100);
                    if (Math.floor(current_hour) < end_hrs) {
                        found = true;
                    }
                }
            } else {
                found = true;
            }
            if (!found) {
              push_day = 1;
            }
          }
      }
      return push_day;
    }
  }


  function dynamicOptions(method_type) {
      if (appMetafields && appMetafields.length > 0) {
        if (method_type == "delivery") {
          let selected_location: string[] = [];
          appMetafields.forEach((metadata) => {
              if (metadata.metafield.key == method_type) {
                  selected_location.push(metadata.metafield.value);
              }
          })
          
          selected_location = JSON.parse(selected_location[0]);
          
          current_delivery_grp = get_delivery_grp(selected_location, zip);

          interface DeliveryLocation {
            enable_delivery: boolean;
          }
          
          for (const location in selected_location) {
            if (Object.prototype.hasOwnProperty.call(selected_location, location)) {
              const delivery_location = selected_location[location]  as unknown as DeliveryLocation;
              const delivery_grp = location;
              
              const enable_delivery = delivery_location.enable_delivery;
              if (enable_delivery) {
                if (current_delivery_grp == delivery_grp) {
            
                  if (delivery_grp != "") {
                    let push_d = offsetdata(method_type, delivery_grp);
                    push_d = Math.floor(push_d) - 1;
                    if (!push_d) {
                        push_d = 0;
                    }

                    const dateToday = new Date(currentDateTime);
                    const myday = dateToday.setDate(dateToday.getDate() + Math.floor(push_d));
                    const push = new Date(myday);

                    last_disabled_date = formatDate(push);
                  }
                }
              }
            }
          }
        } 
      }
    }

  if (zip) {
    dynamicOptions("delivery");
  }

  return { disabled_dates, current_delivery_grp, last_disabled_date};
}