import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useState, useEffect} from "preact/hooks";

import {
  useAttributeValues,
  useApplyAttributeChange,
  useBuyerJourneyIntercept,
  useAppMetafields,
  useBuyerJourneySteps,
} from '@shopify/ui-extensions/checkout/preact';

export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  const [currentDate, setCurrentDate] = useState(null);
  const [lastFetchedTime, setLastFetchedTime] = useState(null);
  const [isWithinCutoff, setIsWithinCutoff] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [cutoffMsg, setCutoffMsg] = useState("");
  const applyAttributeChange = useApplyAttributeChange();
  const metafields = useAppMetafields();
  const activeStep = useBuyerJourneySteps();
  const [Type, LocationGroup, PickupID, DeliveryDate, PickupDate, GiftMsg] = useAttributeValues(['Type', 'Location_Group', 'pickup-id', 'Delivery-Date', 'Pickup-Date', 'Gift-Message']);

  const timezone = "Europe/London";
  const TIMEZONE_API = "https://mrwildflowers.com.au/uk/getapi/webhook/synctime?timeZone=" + timezone;

  const cutoff_message = {
    nodate: "Please select a valid date.",
    passed_date: "Oops! The cutoff for the selected date has passed — Please select another available date."
  }

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentTime = syncTime();
    if (currentTime){
      updateStoreDateTime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate])

  useEffect(() => {
    setIsWithinCutoff(true);
    if (DeliveryDate) {
      setSelectedDate(DeliveryDate);
    } else if (PickupDate) {
      setSelectedDate(PickupDate);
    } else {
      setCutoffMsg(cutoff_message.nodate);
      setIsWithinCutoff(false);
    }
    if (metafields.length > 0) {
      let dateTimeNow = currentDate;
      const syncedTime = syncTime();
      if (syncedTime) {
        dateTimeNow = syncedTime;
      }
      const currentDateTime = formatToReadableDate(dateTimeNow);
      calculateCutoff(currentDateTime);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metafields, activeStep]);

  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    const BLOCK_REASONS = [];

    if (canBlockProgress && !isWithinCutoff) {
      return {
        behavior: 'block',
        reason: 'Invalid postal code',
        errors: [
          {
            message: cutoffMsg
          }
        ],
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
      behavior: "allow",
    };
  });

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

  const formatToReadableDate = (dateString) => {
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

  const calculateCutoff = (currentDateTime) => {
    let locationData = null;
    if (Type == "delivery") {
      locationData = deliveryData();
    } else if (Type == "pickup") {
      locationData = storePickData();
    } else {
      console.log("No Type Detected");
    }
    if (!PickupDate && !DeliveryDate) {
      return;
    }

    const dateTimeParts = currentDateTime.split(', ');
    const timeParts = dateTimeParts[2].split(':');
    const current_hour = parseInt(timeParts[0], 10);
    const current_minutes = parseInt(timeParts[1], 10);
    const day_name = dateTimeParts[0]?.toLowerCase();
    const selected_offset = locationData?.offset;
    const selected_offset_day = getDescendantProp(selected_offset, day_name);
    const current_full_time = current_hour * 100 + (current_minutes / 60) * 100;

    let push_day = 0;
    if (selected_offset_day.before) {
      push_day = selected_offset_day.before;
    }

    if (selected_offset_day.enable_breakpoint) {
      const break_point_val = selected_offset_day.breakpoint;
      const nextday_breakpoint = selected_offset_day.nextday_breakpoint;
      if (selected_offset_day.enable_nextday_breakpoint) {
        if (
            current_full_time >= break_point_val &&
            current_full_time <= nextday_breakpoint
        ) {
            const before_cutoff_day = selected_offset_day.before;
            const next_day_value = 1;
            push_day = +before_cutoff_day + +next_day_value;
        }
        if (current_full_time >= nextday_breakpoint) {
            push_day = selected_offset_day.after;
        }
      }
      else {
        if (current_full_time >= break_point_val) {
            push_day = selected_offset_day.after;
        }
      }
    }
    if (push_day == 0) {
      if ((Type == "delivery")) {
        const selected_days = locationData?.slot;
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
      }else if (Type == "pickup") {
        const selected_days = locationData?.days;
        const selected_time_day = getDescendantProp(selected_days, day_name);
        const last_hour = Math.floor(selected_time_day.end / 100);

        if (Math.floor(current_hour) >= last_hour) {
          push_day = 1;
        }
      }
    }
    push_day = Math.floor(push_day) - 1;
    if (!push_day) {
      push_day = 0;
    }
    const dateToday = new Date(currentDateTime);
    const myday = dateToday.setDate(dateToday.getDate() + Math.floor(push_day));
    const push = new Date(myday);
    const last_disabled_date = formatDate(push);
    const disable_date_obj = new Date(last_disabled_date);
    const selected_date_obj = new Date(selectedDate);
    if (disable_date_obj >= selected_date_obj) {
      setCutoffMsg(cutoff_message.passed_date);
      setIsWithinCutoff(false);
    }    
  }

  const formatDate = (date) => {
    const YEAR = date.getFullYear();
    const MONTH = String(date.getMonth() + 1).padStart(2, "0");
    const DAY = String(date.getDate()).padStart(2, "0");
    return `${YEAR}/${MONTH}/${DAY}`;
  };

  function storePickData() {
    const locationArr = [];
    metafields.forEach((metadata) => {
      if (metadata.metafield.key == "locations") {
          locationArr.push(metadata.metafield.value);
      }
    })
    const storepick_data = JSON.parse(locationArr[0] || '{}');
    const delivery_group = PickupID;
    const selected_location = getDescendantProp(storepick_data, delivery_group);
    return selected_location;
  }

  const deliveryData = () => {
    const locationArr = [];
    metafields.forEach((metadata) => {
      if (metadata.metafield.key == "delivery") {
        locationArr.push(metadata.metafield.value);
      }
    })
    const storepick_data = JSON.parse(locationArr[0] || '{}');
    const delivery_group = LocationGroup;
    const selected_location = getDescendantProp(storepick_data, delivery_group);
    return selected_location;
  }

  function getDescendantProp(obj, desc) {
    const arr = desc?.split(".");
    while (arr.length && (obj = obj[arr.shift()]));
    return obj;
  }

  const capitalize = (str:string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return (
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
  );
}