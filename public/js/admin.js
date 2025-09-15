//admin logout 
function logout() {
  fetch('/users/logout', {
    method: 'GET',
    credentials: 'include'
  })
    .then(() => {
      window.location.href = '/';
    })
    .catch(error => console.error(error));
}

//schedule calendar
const daysContainer = document.getElementById("days");
const prevWeekButton = document.getElementById("prevWeek");
const nextWeekButton = document.getElementById("nextWeek");
const timeSlotsElement = document.getElementById("timeSlots");
const scheduleButton = document.getElementById("ScheduleButton");
let selectedSlots = [];
let scheduleData = [];

if (selectedSlots.length === 0) {
  scheduleButton.textContent = "Schedule free day";
} 

const currentDate = new Date();
const lastWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7);
const selectedDate = new Date();
let selectedDay = null;
let selectedTimeSlot = null;

function updateDays() {
  daysContainer.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const day = document.createElement("div");
    const displayDate = new Date(selectedDate);
    displayDate.setDate(selectedDate.getDate() + i);
    day.className = "day";
    day.innerHTML = `${displayDate.toLocaleDateString("en-US", { weekday: "long" })}<br>${displayDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })}`;
    day.addEventListener("click", () => {
      if (selectedDay) {
        selectedDay.classList.remove("selected");
      }
      day.classList.add("selected");
      selectedDay = day;
      selectedDate.setDate(displayDate.getDate());
      setPrevWeekButtonDisabled();
      updateTimes();
      scheduleButton.textContent = "Schedule free day";
      selectedSlots = [];
    });

    // Check if the current date exists in scheduleData
    const currentDate = selectedDate.toISOString().substring(0, 10);
    const hasSelected = scheduleData.find(schedule => schedule.date === currentDate && schedule.slots.some(slot => slot.isReserved));
    if (hasSelected) {
      day.classList.add("selected");
      selectedDay = day;
      selectedSlots = hasSelected.slots.filter(slot => slot.isReserved).map(slot => slot.startTime + " - " + slot.endTime);
      scheduleButton.textContent = "Schedule";

    }

    daysContainer.appendChild(day);
  }

  if (!selectedDay) {
    daysContainer.children[0].click();
  }
  setPrevWeekButtonDisabled();
}

function updateTimes() {
  timeSlotsElement.innerHTML = "";
  const isFree = window.location.pathname.includes('free');

  const interval = isFree ? 15 : 50;
  const gap = isFree ? 15 : 10;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  for (let hour = 7; hour < 23; hour++) {
    for (let min = 0; min < 60; min += interval + gap) {
      if (selectedDate.toDateString() === now.toDateString() && (hour < currentHour || (hour === currentHour && min <= currentMin))) {
        continue;
      }

      let endMin = min + interval;
      let endHour = hour;

      if (endMin >= 60) {
        endMin -= 60;
        endHour++;
      }

      const timeSlot = document.createElement("div");
      timeSlot.className = "time-slot";
      timeSlot.textContent = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")} - ${(endMin >= 60 ? (hour + 1) : hour).toString().padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`;
      timeSlot.addEventListener("click", () => {
        if (timeSlot.classList.contains("selected")) {
          timeSlot.classList.remove("selected");
          selectedSlots = selectedSlots.filter(slot => slot !== timeSlot.textContent);
        } else {
          timeSlot.classList.add("selected");
          selectedSlots.push(timeSlot.textContent);
        }

        if (selectedSlots.length > 0) {
          scheduleButton.textContent = "Schedule";
        } else {
          scheduleButton.textContent = "Schedule free day";
        }
      });

      // Check if the current slot is selected in scheduleData
      const currentDate = selectedDate.toISOString().substring(0, 10);
      const currentTime = timeSlot.textContent;
      const hasSelected = scheduleData.find(schedule => schedule.date === currentDate && schedule.slots.find(slot => slot.startTime === currentTime && slot.isReserved));
      if (hasSelected) {
        timeSlot.classList.add("selected");
        selectedSlots.push(timeSlot.textContent);
      }

      timeSlotsElement.appendChild(timeSlot);
    }
  }
}

function setPrevWeekButtonDisabled() {
  const oneWeekAgo = new Date(currentDate);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  if (selectedDate <= oneWeekAgo || selectedDate <= new Date()) {
    prevWeekButton.disabled = true;
  } else {
    prevWeekButton.disabled = false;
  }
}

prevWeekButton.addEventListener("click", () => {
  selectedDate.setDate(selectedDate.getDate() - 7);
  updateDays();
  setPrevWeekButtonDisabled();
  scheduleButton.textContent = "Schedule free day";
  timeSlotsElement.querySelectorAll(".time-slot.selected").forEach(slot => {
    slot.classList.remove("selected");
  });
});

nextWeekButton.addEventListener("click", () => {
  selectedDate.setDate(selectedDate.getDate() + 7);
  updateDays();
  scheduleButton.textContent = "Schedule free day";
  timeSlotsElement.querySelectorAll(".time-slot.selected").forEach(slot => {
    slot.classList.remove("selected");
  });
});

updateDays();

const scheduleForm = document.getElementById("scheduleForm");

scheduleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const date = selectedDate;
  const slots = selectedSlots.map(slot => {
    const [startTime, endTime] = slot.split(" - ");
    return {
      startTime,
      endTime,
      isReserved: false
    };
  });

  document.getElementById("appointmentDate").value = date;
  document.getElementById("appointmentTime").value = slots.map(slot => slot.startTime + " - " + slot.endTime).join(",");

  const formData = {
    date: date,
    slots: slots,
  };

  console.log(formData);

  fetch("/admin/schedule", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.text();
    })
    .then(() => {
      console.log("Schedule saved successfully");
      window.location.href = "/admin/schedule";
    })
    .catch(error => {
      console.error("Error:", error);
    });

});


