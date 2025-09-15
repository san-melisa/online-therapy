// add more university
  document.addEventListener("click", function (e) {
    if (e.target && e.target.classList.contains("add-university-btn")) {
      addUniversity();
    }
  });


function addUniversity() {
  const universityWrapper = document.querySelector(".university-group");
  const count = parseInt(universityWrapper.querySelector('.base-form input[name="universityCount"]').value);

  const newUniversityHtml = `
    <div class="form-group university-group">
        <input type="text" class="form-control" placeholder="University Name" name="university[${count}].uniName" required>
        <input type="text" class="form-control" placeholder="Degree" name="university[${count}].degree" required>
        <input type="text" class="form-control" placeholder="Department" name="university[${count}].department" required>
        <input type="number" class="form-control" placeholder="Graduation Year" name="university[${count}].graduationYear" required>
        <button class="add-university-btn" type="button">+ Add Another University</button>
    </div>
  `;

  universityWrapper.insertAdjacentHTML("beforeend", newUniversityHtml);

  document.querySelector('.base-form input[name="universityCount"]').value = count + 1;
}


// sidebar controls

const expertiseCheckboxes = document.querySelectorAll('.expertise-checkbox');
const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
const therapistCards = document.querySelectorAll('.therapist-card');

function updateTherapistVisibility() {
  const selectedExpertises = Array.from(expertiseCheckboxes)
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);

  const selectedCategories = Array.from(categoryCheckboxes)
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);

  therapistCards.forEach(card => {
    const cardExpertises = card.dataset.expertises.split(',');
    const cardCategory = card.dataset.category;

    const isVisible =
      (selectedExpertises.length === 0 ||
        selectedExpertises.every(expertise =>
          cardExpertises.includes(expertise)
        )) &&
      (selectedCategories.length === 0 ||
        selectedCategories.every(category =>
          cardCategory.includes(category)))

    card.style.display = isVisible ? 'block' : 'none';
  });
}

function handleCategoryCheckboxChange(event) {
  categoryCheckboxes.forEach(checkbox => {
    if (checkbox !== event.target) {
      checkbox.checked = false;
    }
  });
  updateTherapistVisibility();
}

updateTherapistVisibility();

expertiseCheckboxes.forEach(checkbox =>
  checkbox.addEventListener('change', updateTherapistVisibility)
);

categoryCheckboxes.forEach(checkbox =>
  checkbox.addEventListener('change', handleCategoryCheckboxChange)
);

// show limited therapists

const allTherapists = document.querySelectorAll(".therapist-card");
const loadMoreButton = document.querySelector("#load-more");
const cardsPerLoad = 3;
let visibleCardsCount = 0;

function showCards(count) {
  for (let i = visibleCardsCount; i < visibleCardsCount + count; i++) {
    if (i < allTherapists.length) {
      allTherapists[i].style.display = "block";
    }
  }
  visibleCardsCount += count;
  if (visibleCardsCount >= allTherapists.length) {
    loadMoreButton.style.display = "none";
  }
}
if (allTherapists.length > cardsPerLoad) {
  allTherapists.forEach(card => {
    card.style.display = "none";
  });
  showCards(cardsPerLoad);
  if (loadMoreButton) {
    loadMoreButton.style.display = "block";
  }
} else {
  if (loadMoreButton) {
    loadMoreButton.style.display = "none";
  }
}

if (loadMoreButton) {
  loadMoreButton.addEventListener("click", () => {
    showCards(cardsPerLoad);
  });
}


//show and hide bookings
function toggleUpcomingBookings() {
  var bookingsDiv = document.getElementById('futureBookings');
  var button = document.getElementById('toggleUpcomingBookings');
  if (bookingsDiv.style.display === "none") {
    bookingsDiv.style.display = "block";
    button.innerHTML = '<i class="fas fa-chevron-up"></i>';
  } else {
    bookingsDiv.style.display = "none";
    button.innerHTML = '<i class="fas fa-chevron-down"></i>';
  }
}

function togglePastBookings() {
  var bookingsDiv = document.getElementById('pastBookings');
  var button = document.getElementById('togglePastBookings');
  if (bookingsDiv.style.display === "none") {
    bookingsDiv.style.display = "block";
    button.innerHTML = '<i class="fas fa-chevron-up"></i>';
  } else {
    bookingsDiv.style.display = "none";
    button.innerHTML = '<i class="fas fa-chevron-down"></i>';
  }
}
