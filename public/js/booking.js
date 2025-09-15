
//booking calendar
//Calendar
var daysContainer = document.getElementById("days");
var prevWeekButton = document.getElementById("prevWeek");
var nextWeekButton = document.getElementById("nextWeek");
var timeSlotsElement = document.getElementById("timeSlots");

var currentDate = new Date();
var lastWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7);
var selectedDate = new Date();
let selectedDay = null;
let selectedTimeSlot = null;

function updateDays() {
  daysContainer.innerHTML = "";
  for (let i = 0; i < scheduleData.length; i++) {
    const dayData = scheduleData[i];
    const day = document.createElement("div");
    day.className = "day";
    day.innerHTML = `${new Date(dayData.date).toLocaleDateString("en-US",
      { weekday: "long", day: "numeric", month: "short" })}`;
    day.addEventListener("click", () => {
      if (selectedDay) {
        selectedDay.classList.remove("selected");
      }
      day.classList.add("selected");
      selectedDay = day;
      selectedDate = new Date(dayData.date);
      updateTimes(dayData.slots);
    });
    daysContainer.appendChild(day);
  }

  if (!selectedDay) {
    daysContainer.children[0].click();
  }
}

function updateTimes(slots) {
  timeSlotsElement.innerHTML = "";
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const timeSlot = document.createElement("div");
    timeSlot.className = "time-slot";
    timeSlot.textContent = `${slot.startTime} - ${slot.endTime}`;
    timeSlot.addEventListener("click", () => {
      if (selectedTimeSlot === timeSlot) {
        selectedTimeSlot.classList.remove("selected");
        selectedTimeSlot = null;
      } else {
        if (selectedTimeSlot) {
          selectedTimeSlot.classList.remove("selected");
        }
        timeSlot.classList.add("selected");
        selectedTimeSlot = timeSlot;
      }
    });
    timeSlotsElement.appendChild(timeSlot);
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
  console.log("setPrevWeekButtonDisabled", prevWeekButton.disabled);

}

prevWeekButton.addEventListener("click", () => {
  selectedDate.setDate(selectedDate.getDate() - 7);
  updateDays();
  setPrevWeekButtonDisabled();
});

nextWeekButton.addEventListener("click", () => {
  selectedDate.setDate(selectedDate.getDate() + 7);
  updateDays();
});

updateDays();

//type platform details element
const platformInputs = document.querySelectorAll('input[name="platform"]');
const platformDetailsDiv = document.getElementById("platform-details");
const platformDetailsText = document.getElementById("platform-details-text");
const platformDetailsInput = document.getElementById("platform-details-input");

function updatePlatformDetails() {
  const selectedPlatform = document.querySelector('input[name="platform"]:checked').value;
  platformDetailsDiv.style.display = 'block';

  if (selectedPlatform === 'skype') {
    platformDetailsText.textContent = 'Please enter your Skype username:';
  } else if (selectedPlatform === 'whatsapp') {
    platformDetailsText.textContent = 'Please enter your WhatsApp phone number:';
  } else if (selectedPlatform === 'zoom') {
    platformDetailsText.textContent = 'Please enter your email for Zoom invitation link:';
  }
  else {
    platformDetailsDiv.style.display = 'none';
  }
}

platformInputs.forEach(input => {
  input.addEventListener('change', updatePlatformDetails);
});


//enable confirm booking button
const confirmButton = document.getElementById("confirmButton");
const meetingTypeInputs = document.querySelectorAll('input[name="meetingType"]');

function checkIfAllSelected() {
  const meetingTypeSelected = document.querySelector('input[name="meetingType"]:checked');
  const platformSelected = document.querySelector('input[name="platform"]:checked');
  const platformDetailsProvided = platformDetailsInput.value !== "";
  const appointmentSelected = selectedTimeSlot !== null;

  if (meetingTypeSelected && platformSelected && platformDetailsProvided && appointmentSelected) {
    confirmButton.removeAttribute("disabled");
  } else {
    confirmButton.setAttribute("disabled", true);
  }
}

meetingTypeInputs.forEach(input => {
  input.addEventListener('change', checkIfAllSelected);
});

platformInputs.forEach(input => {
  input.addEventListener('change', checkIfAllSelected);
});

platformDetailsInput.addEventListener('input', checkIfAllSelected);

timeSlotsElement.addEventListener('click', () => {
  setTimeout(checkIfAllSelected, 0); 
});


const form = document.querySelector('form');

const urlParts = window.location.pathname.split('/');
const isFree = urlParts.includes('free');
const therapistId = urlParts[urlParts.length - 1];

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const selectedPlatform = document.querySelector('input[name="platform"]:checked').value;
  const platformDetails = platformDetailsInput.value;
  const appointmentDate = selectedDate.toISOString().substring(0, 10); // YYYY-MM-DD format
  const appointmentTime = selectedTimeSlot ? selectedTimeSlot.textContent.split(' - ')[0] : ''; // Seçili bir zaman dilimi varsa onu alır.
  const meetingType = document.querySelector('input[name="meetingType"]:checked').value;

  document.getElementById('appointmentDate').value = appointmentDate;
  document.getElementById('appointmentTime').value = appointmentTime;

  const formData = {
    meetingType: meetingType,
    platform: selectedPlatform,
    platformDetails: platformDetails,
    appointmentDate: appointmentDate,
    appointmentTime: appointmentTime,
  };

  const url = `/booking/${therapistId}`;
  const responseUrl = `/therapist/${therapistId}`

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(() => {
      window.location.href = responseUrl;
    })
    .catch((error) => {
      console.error('Error:', error);
    });
});

//add shadow when a radio button selected in booking
const radios = document.querySelectorAll('.custom-card input[type="radio"]');

radios.forEach(radio => {
  radio.addEventListener('change', function () {
    const sameNameRadios = document.querySelectorAll(`.custom-card input[type="radio"][name="${this.name}"]`);

    sameNameRadios.forEach(sameNameRadio => {
      sameNameRadio.parentElement.style.boxShadow = '';
    });

    if (this.checked) {
      this.parentElement.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    }
  });
});

