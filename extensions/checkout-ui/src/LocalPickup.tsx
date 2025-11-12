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
} from '@shopify/ui-extensions/checkout/preact';

export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  const [giftMessage, setGiftMessage] = useState("");
  const [receipentFirstName, setReceipentFirstName] = useState("");
  const [receipentLastName, setReceipentLastName] = useState("");
  const [remainingChars, setRemainingChars] = useState(300);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [lastDisabledDate, setLastDisabledDate] = useState("");
  const [currentDeliveryGroup, setCurrentDeliveryGroup] = useState("");
  const [dateErrMsg, setDateErrMsg] = useState("");
  const [disallowedDates, setDisallowedDates] = useState("");
  const [formattedDate, setFormattedDate] = useState("");
  const [populateTimeFn, setPopulateTimeFn] = useState<(date: string, method: string) => unknown[]>(
  () => () => []
  );
  const [currentDate, setCurrentDate] = useState(null);
  const [canUseMetafields, setCanUseMetafields] = useState(null);
  const [lastFetchedTime, setLastFetchedTime] = useState(null);
  const [pickupTimes, setPickupTimes] = useState({
    show: false,
    data: []
  })
  const modalRef = useRef(null);
  const isMountedRef = useRef(true);
  const skipUserIntercepts = useRef(false);

  const initialValidationState = {
    zipError: "",
    dateError: dateErrMsg,
    firstNameValidationError: "",
    lastNameValidationError: "",
    residentialError: ""
  }

  const [validationError, setValidationError] = useState(initialValidationState);

  const metafields = useAppMetafields();
  const applyAttributeChange = useApplyAttributeChange();
  const deliveryGroups = useDeliveryGroups();
  const firstDeliveryGroup = useDeliveryGroup(deliveryGroups[0]);
  const selectedDeliveryOption = firstDeliveryGroup?.selectedDeliveryOption;
  const [GiftMsg, RecipentFirstName, RecipentLastName, Type] = useAttributeValues(['Gift-Message', 'First-name-of-the-Recipient', 'Last-name-of-the-Recipient', 'Type', 'Pickup-Date', 'Pickup-Time']);
  const timezone = "Europe/London";
  const TIMEZONE_API = "https://mrwildflowers.com.au/uk/getapi/webhook/synctime?timeZone=" + timezone;

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

    getTime();

    return () => {
      isMountedRef.current = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateStoreDateTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate])

  useEffect(() => {
    if (GiftMsg) {
      setGiftMessage(GiftMsg);
    }
    if (RecipentFirstName) {
      setReceipentFirstName(RecipentFirstName);
    }
    if (RecipentLastName) {
      setReceipentLastName(RecipentLastName);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [GiftMsg, RecipentFirstName, RecipentLastName])

  useEffect(() => {
    if (Type === "delivery") {
      setSelectedDate("");
      setSelectedTime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeliveryOption?.type])


  useEffect(() => {
    skipUserIntercepts.current = true;
    if (canUseMetafields) {
      runDateFunctions();
    }
    setValidationError((prev) => ({
      ...prev,
      dateError: "",
    }));
    setSelectedDate("");
    setSelectedTime("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeliveryOption?.code])

  useEffect(() => {
    if (metafields.length > 0) {
      setCanUseMetafields(true);
    } else {
      setCanUseMetafields(false);
      console.log('Waiting for metafields to load...');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metafields]);

  useEffect(() => {
    updateStoreDateTime();
    const attributesToUpdate = [
      { key: 'Type', value: 'pickup' },
      { key: 'Pickup-Date', value: selectedDate ? formatDate2(selectedDate) : '' },
      { key: 'pickup-id', value: currentDeliveryGroup },
      { key: 'Special-Delivery-Instruction', value: '' },
      { key: 'Delivery-Address-of-Recipient', value: '' },
      { key: 'Delivery-Date', value: '' },
      { key: 'Location_Group', value: '' },
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
  }, [selectedDate, selectedTime]);


  type BuyerJourneyStepResult = { behavior: "allow" | "block" };
  type BlockReason = {
    behavior: "block";
    reason: string;
    perform: (result: BuyerJourneyStepResult) => void;
  };

  useBuyerJourneyIntercept(({ canBlockProgress }) => {

    if (skipUserIntercepts.current) {
      skipUserIntercepts.current = false;
      return {
        behavior: "allow"
      }; 
    }
    
    console.log("USER BUYER JOURNERY CALLED")
    const BLOCK_REASONS: BlockReason[] = [];

    if (canBlockProgress && !isRecipientnameSet()) {
      BLOCK_REASONS.push({
        behavior: "block",
        reason: "Both first & last name field is required",
        perform: (result) => {
          if (result.behavior === "block") {
            if (!receipentFirstName) {
              setValidationError((prev) => ({
                ...prev,
                firstNameValidationError: "Please enter the recipient first name",
              }));
            }

            if (!receipentLastName) {
              setValidationError((prev) => ({
                ...prev,
                lastNameValidationError: "Please enter the recipient last name",
              }));
            }
          }
        },
      });
    }

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
    setValidationError(initialValidationState);
  }

  const dateValidation = () => {
    if (!selectedDate) {
      setDateErrMsg("Please choose a pickup date.");
      return false;
    }
    if (selectedDate && pickupTimes.show && !selectedTime) {
      setDateErrMsg("Please choose both pickup date & time.");
      return false;
    }
    if (selectedDate && lastDisabledDate){
      const selectedDateObj = new Date(selectedDate);
      const lastDisabledDateObj = new Date(lastDisabledDate);
      const allDisabledDates = disallowedDates
      ?.split(",")
      .map(d => d.replace(/[-\s]/g, ""))
      .map(d => d.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));
      if (selectedDateObj < lastDisabledDateObj || allDisabledDates?.includes(selectedDate)){
        setDateErrMsg("Selected date is invalid. Please choose another pickup date.");
        return false;
      }
    }
    setDateErrMsg("");
    return true;
  }

  const isRecipientnameSet = () => {
    if (!receipentFirstName || !receipentLastName) {
      return false;
    } else {
      return true;
    }
  }

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
    
    const {disabled_dates, current_delivery_grp, last_disabled_date, populate_time} = DateFunctions(metafields, selectedDeliveryOption, currentDateTime);
    setPopulateTimeFn(() => populate_time);
    setLastDisabledDate(last_disabled_date);
    setCurrentDeliveryGroup(current_delivery_grp);
    const disableDatesStr = [...disabled_dates];
    const lastDisabledDate = "--" + last_disabled_date;
    disableDatesStr.push(lastDisabledDate);
    setDisallowedDates(disableDatesStr.join(','));
    console.log({disabled_dates, current_delivery_grp, last_disabled_date, currentDateTime, selectedDate, selectedTime});
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
      const datePart = currentDate?.split(", ")[0];
      const timeOnly = currentDate?.split(", ")[1]; 
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
      console.log({data})
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

  const handleDateChange = (e: Event & {currentTarget: HTMLInputElement}) => {
    const SELECTED_DATE = e.currentTarget.value;
    setSelectedDate(SELECTED_DATE);
    const DATE_OBJ = new Date(SELECTED_DATE + 'T00:00:00');
    setFormattedDate(formatDate(DATE_OBJ));
    setSelectedTime("");
    const available_timeslots = populateTimeFn(SELECTED_DATE, "pickup")
    if (available_timeslots.length > 1){
      console.log({available_timeslots})
      setPickupTimes({
        show: true,
        data: available_timeslots
      })
    } else {
      setDateErrMsg("");
      setPickupTimes({
        show: false,
        data: []
      })
      if (modalRef.current && typeof modalRef.current.hideOverlay === 'function') {
        modalRef.current.hideOverlay();
      }
    }
    
  };

  const handlePickupTime = (e: Event & { currentTarget: HTMLSelectElement }) => {
    const selected_time = e.currentTarget.value;
    setSelectedTime(selected_time);
    applyAttributeChange(
      { type: 'updateAttribute', key: 'Pickup-Time', value: selected_time }
    )
    if (modalRef.current && typeof modalRef.current.hideOverlay === 'function') {
      modalRef.current.hideOverlay();
    }
  }

  const handleRecipentFirstName = (e: Event & { currentTarget: HTMLInputElement }) => {
    const val = (e.target as HTMLInputElement).value;
    setReceipentFirstName(val);
    applyAttributeChange(
      { type: 'updateAttribute', key: 'First-name-of-the-Recipient', value: val }
    )
    setValidationError((prev) => ({
      ...prev,
      firstNameValidationError: "",
    }));  
  }

  const handleRecipentLastName = (e: Event & { currentTarget: HTMLInputElement }) => {
    const val = (e.target as HTMLInputElement).value;
    setReceipentLastName(val);
    applyAttributeChange(
      { type: 'updateAttribute', key: 'Last-name-of-the-Recipient', value: val }
    )
    setValidationError((prev) => ({
      ...prev,
      lastNameValidationError: "",
    }));  
  }

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
        <s-grid gridTemplateColumns="1fr 1fr" gap='base' >
          <s-grid-item >
            <s-text-field
              name="Recipient First Name"
              onChange={handleRecipentFirstName}
              required={true}
              error={validationError.firstNameValidationError}
              value={receipentFirstName}
              label="Recipient First Name">
            </s-text-field>
          </s-grid-item>
          <s-grid-item>
            <s-text-field
              name="Recipient Last Name"
              onChange={handleRecipentLastName}
              required={true}
              error={validationError.lastNameValidationError}
              value={receipentLastName}
              label="Recipient Last Name">
            </s-text-field>
          </s-grid-item>
        </s-grid>
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

        <s-clickable command='--show' commandFor="pickup-datepicker">
          <s-text-field
            icon='calendar'
            label={pickupTimes.show ? 'Select Pickup Date & Time' : 'Select Pickup Date'}
            error={validationError.dateError}
            required={true}
            value={(selectedDate ? formattedDate : '') + (selectedTime ? '  ' + selectedTime : '')}
          />
        </s-clickable>
        
      </s-stack>

      <s-modal id="pickup-datepicker" onShow={showDatePicker} ref={modalRef}>
        <s-stack gap='large-300' justifyContent='center' paddingBlockEnd='large'>
          <s-stack direction="inline" justifyContent='center'>
            <s-text type='strong' color='subdued'>
            Please select the available date
          </s-text>
          </s-stack>
          <s-date-picker
            onChange={handleDateChange}
            value={selectedDate}
            defaultValue= {selectedDate}
            disallow={disallowedDates}
          ></s-date-picker>

          {selectedDate && (
          <s-stack direction="inline" gap='small-300' justifyContent='center'>
            <s-text>Selected Date:</s-text>
            <s-time dateTime={selectedDate}>{formattedDate}</s-time>
          </s-stack>
          )}

          {pickupTimes.show && selectedDate && (
            <s-stack direction='inline' justifyContent='center'>
              <s-box minInlineSize='250px'>
                <s-select
                  name="Select Pickup Time"
                  label="Select Pickup Time"
                  value={selectedTime}
                  onChange={handlePickupTime}
                >
                  {pickupTimes.data.map((slot, index) => (
                    <s-option selected={selectedTime == slot.value} key={index} value={slot.value}>
                      {slot.label}
                    </s-option>
                  ))}
                </s-select>
              </s-box>
            </s-stack>
          )}

        </s-stack>
      </s-modal>

    </>
  );

}


const DateFunctions = (metafields, selectedDeliveryOption, currentDateTime) => {
  const appMetafields = metafields;
  
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
    const arr = desc?.split(".");
    while (arr.length && (obj = obj[arr.shift()]));
    return obj;
  }

  interface StorePickData {
    key: string;
    data: {
      days?: {
        enable_pickuptime?: boolean;
        [key: string]: unknown;
      };
    };
  }

  function storePickData(): StorePickData {
    const locationArr: string[] = [];
    let selected_store_key = "";
    let selected_store_data: object = null;
    metafields.forEach((metadata) => {
      if (metadata.metafield.key == "locations") {
          locationArr.push(metadata.metafield.value);
      }
    })
    const storepick_data = JSON.parse(locationArr[0] || '{}');
    const location_title = selectedDeliveryOption.title?.toLowerCase();

    for (const key in storepick_data) {
        if (Object.prototype.hasOwnProperty.call(storepick_data, key)) {
          const innerObject = storepick_data[key];
          const location_name = innerObject.location_name?.toLowerCase();
          if (location_title === location_name) {
            selected_store_key = key;
            selected_store_data = innerObject;
            break;
          }
        }
    }
    return { key: selected_store_key, data: selected_store_data };
  }

  function changetimeformat(range) {
    const time_window = range.split("-");
    const new_time_window = [];
    for (let i = 0; i < time_window.length; i++) {
      const time = time_window[i].split(":");
      let hours = time[0].trim();
      const minutes = time[1].trim();
      // Check whether AM or PM
      const newformat = hours >= 12 ? "pm" : "am";

      // Find current hour in AM-PM Format
      hours = hours % 12;

      // To display "0" as "12"
      hours = hours ? hours : 12;
      //minutes = minutes < 10 ? '0' + minutes : minutes;
      new_time_window.push(hours + ":" + minutes + "" + newformat);
    }
    return new_time_window.join(" - ");
  }

  function populate_date(method_name = "pickup", selected_location) {
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

    if (method_name == "pickup") {
      const days_list = selected_location?.days;
      if(days_list) {
          for (const i in weekday) {
              const info_day = weekday[i];
              if (days_list[info_day]) {
                  if (days_list[info_day].disable) {
                      disabled_dates.push(capitalize(info_day));
                  }
              }
          }
      }
    }
  }

  function populate_time(date: string, method_type = "pickup") {

    const available_timeslots = [{
      value: '',
      label: 'Choose Time',
    }];

    const d = new Date(date);
    const select_date = d.toDateString();
    const dateTimeParts = currentDateTime.split(', ');
    const timeParts = dateTimeParts[2].split(':');
    const n = d.getDay();
    let today_d = currentDateTime;
    today_d = new Date(today_d);
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const day_name = days[n];

    if (method_type == "pickup") {
      const locationArr = [];
      appMetafields.forEach((metadata) => {
        if (metadata.metafield.key == "locations") {
          locationArr.push(metadata.metafield.value);
        }
      })
  
      const {key, data} = storePickData();
      console.log({key, data, locationArr})
      const selected_offset = data?.days;
      const today_d_string = today_d.toDateString();
      const current_hour = parseInt(timeParts[0], 10);
      let hour_earlier: string | number;
      let time_window: string | number;

      if (selected_offset?.enable_pickuptime) {
        const selected_offset_day = getDescendantProp(selected_offset, day_name);

        if (!selected_offset_day.disable) {
            const first_hour = parseInt(selected_offset_day.start);
            const last_hour = parseInt(selected_offset_day.end);
            let count = Math.floor(first_hour);

            if (select_date == today_d_string) {
              if (current_hour <= count / 100) {
                if (count % 100 == 0) {
                    const val = Math.floor(count / 100) + ":00";
                    count += 100;
                    hour_earlier = val;
                } else {
                    const val = Math.floor(count / 100) + ":30";
                    count += 50;
                    hour_earlier = val;
                }
              } else {
                  hour_earlier = "";
                  if (count % 100 != 0) {
                      count += 50;
                  }
              }

            } else {
              if (count % 100 == 0) {
                  const val = Math.floor(count / 100) + ":00";
                  count += 100;
                  hour_earlier = val;
              } else {
                  const val = Math.floor(count / 100) + ":30";
                  console.log({ val })
                  count += 50;
                  hour_earlier = val;
              }

            }

            while (count <= last_hour) {
              if (select_date == today_d_string) {
                  if (current_hour >= count / 100) {
                      if (!hour_earlier) {
                          hour_earlier = current_hour + ":00";
                      }
                      count += 100;
                      continue;
                  }
              }

              const val = Math.floor(count / 100) + ":00";
              time_window = hour_earlier + " - " + val;
              time_window = changetimeformat(time_window);
              available_timeslots.push({
                  value: time_window,
                  label: time_window
              })
              count += 100;
              hour_earlier = val;
            }

            if (select_date == today_d_string) {
                if (last_hour % 100 != 0 && first_hour != last_hour) {
                  hour_earlier = (last_hour - 50) / 100;
                  const hour = (last_hour / 100);
                  if (current_hour <= hour) {
                      const vals = hour + ":30";
                      // eslint-disable-next-line no-useless-concat
                      time_window = hour_earlier + ":00" + " - " + vals;
                      time_window = changetimeformat(time_window);
                      available_timeslots.push({
                          value: time_window,
                          label: time_window
                      })
                  }
                }
            } else {
              if (last_hour % 100 != 0 && first_hour != last_hour) {
                  hour_earlier = (last_hour - 50) / 100;
                  const hour = Math.floor(last_hour / 100);
                  const vals = hour + ":30";
                  // eslint-disable-next-line no-useless-concat
                  time_window = hour_earlier + ":00" + " - " + vals;
                  time_window = changetimeformat(time_window);
                  available_timeslots.push({
                      value: time_window,
                      label: time_window
                  })
                }
            }

          }
       } 
    }
    return available_timeslots;
  }


  function offsetdata(method_name = "pickup", selected_location) {
    if (method_name) {    

      const dateTimeParts = currentDateTime?.split(', ');
      const timeParts = dateTimeParts[2]?.split(':');
      const current_hour = parseInt(timeParts[0], 10);
      const current_minutes = parseInt(timeParts[1], 10);
      const day_name = dateTimeParts[0]?.toLowerCase();

      const selected_offset = selected_location.offset;
      const selected_offset_day = getDescendantProp(selected_offset, day_name);

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
          if (method_name == "pickup") {
              const selected_days = selected_location?.days;
              const selected_time_day = getDescendantProp(selected_days, day_name);
              const last_hour = Math.floor(selected_time_day.end / 100);

              if (Math.floor(current_hour) >= last_hour) {
                push_day = 1;
              }
          }
      }
      return push_day;
    }
  }

  function dynamicOptions(method_type = "pickup") {
    if (appMetafields && appMetafields.length > 0) {
      if (method_type == "pickup") {
        const { key, data } = storePickData();
        current_delivery_grp = key;
        const specific_location = data;
        let push_d = offsetdata(method_type, specific_location);
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

  dynamicOptions("pickup");

  return { disabled_dates, current_delivery_grp, last_disabled_date, populate_time};
}