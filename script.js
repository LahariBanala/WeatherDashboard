const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const refreshButton = document.getElementById("refreshButton");
const statusBox = document.getElementById("status");
const weatherPanel = document.getElementById("weatherPanel");

let lastCity = "";
let activeRequest = 0;

const weatherDescriptions = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Foggy", "🌫️"],
  48: ["Depositing rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Moderate drizzle", "🌦️"],
  55: ["Dense drizzle", "🌧️"],
  56: ["Light freezing drizzle", "🌧️"],
  57: ["Dense freezing drizzle", "🌧️"],
  61: ["Slight rain", "🌦️"],
  63: ["Moderate rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Light freezing rain", "🌧️"],
  67: ["Heavy freezing rain", "🌧️"],
  71: ["Slight snowfall", "🌨️"],
  73: ["Moderate snowfall", "❄️"],
  75: ["Heavy snowfall", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Slight rain showers", "🌦️"],
  81: ["Moderate rain showers", "🌧️"],
  82: ["Violent rain showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Thunderstorm with heavy hail", "⛈️"]
};

function showStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = "status";

  if (type) {
    statusBox.classList.add(type);
  }
}

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather service returned error ${response.status}.`);
  }

  return await response.json();
}

async function getWeather(city) {
  const requestId = ++activeRequest;

  searchButton.disabled = true;
  searchButton.textContent = "Loading...";
  showStatus(`Getting weather information for ${city}...`);

  try {
    const geoURL =
      "https://geocoding-api.open-meteo.com/v1/search?" +
      new URLSearchParams({
        name: city,
        count: "1",
        language: "en",
        format: "json"
      });

    const geoData = await fetchJSON(geoURL);

    if (requestId !== activeRequest) return;

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(
        "City not found. Please check the spelling and try again."
      );
    }

    const place = geoData.results[0];

    const weatherURL =
      "https://api.open-meteo.com/v1/forecast?" +
      new URLSearchParams({
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        current: [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "is_day",
          "precipitation",
          "weather_code",
          "cloud_cover",
          "wind_speed_10m"
        ].join(","),
        timezone: "auto"
      });

    const weatherData = await fetchJSON(weatherURL);

    if (requestId !== activeRequest) return;

    const current = weatherData.current;

    if (!current) {
      throw new Error("Weather information is currently unavailable.");
    }

    if (current.temperature_2m == null) {
      throw new Error("Temperature data is unavailable for this city.");
    }

    displayWeather(place, current, weatherData.timezone);
    lastCity = city;

    weatherPanel.hidden = false;
    showStatus("Weather updated successfully!", "success");
  } catch (error) {
    if (requestId !== activeRequest) return;

    console.error("Weather request failed:", error);

    if (error instanceof TypeError) {
      showStatus(
        "Network error. Check your internet connection and try again.",
        "error"
      );
    } else {
      showStatus(
        error.message || "Something went wrong. Please try again.",
        "error"
      );
    }
  } finally {
    if (requestId === activeRequest) {
      searchButton.disabled = false;
      searchButton.innerHTML = 'Search <span>→</span>';
    }
  }
}

function displayWeather(place, current, timezone) {
  const [description, emoji] =
    weatherDescriptions[current.weather_code] ||
    ["Weather conditions unavailable", "🌍"];

  const locationParts = [
    place.name,
    place.admin1,
    place.country
  ].filter(Boolean);

  document.getElementById("locationName").textContent =
    [...new Set(locationParts)].join(", ");

  document.getElementById("weatherEmoji").textContent = emoji;
  document.getElementById("description").textContent = description;

  document.getElementById("temperature").textContent =
    Math.round(current.temperature_2m) + "°";

  document.getElementById("feelsLike").textContent =
    Math.round(current.apparent_temperature) + "°C";

  document.getElementById("feelsMetric").textContent =
    Math.round(current.apparent_temperature) + "°C";

  document.getElementById("humidity").textContent =
    current.relative_humidity_2m + "%";

  document.getElementById("wind").innerHTML =
    `${current.wind_speed_10m} <small>km/h</small>`;

  document.getElementById("cloudCover").textContent =
    current.cloud_cover + "%";

  const timeText = current.time
    ? current.time.replace("T", " ") + (timezone ? ` (${timezone})` : "")
    : "Latest available observation";

  document.getElementById("localTime").textContent =
    "Observation time: " + timeText;
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();

  if (!city) {
    showStatus("Please enter a city name.", "error");
    cityInput.focus();
    return;
  }

  await getWeather(city);
});

refreshButton.addEventListener("click", async () => {
  if (lastCity) {
    await getWeather(lastCity);
  }
});

// Load an initial example city when the page opens.
getWeather("Hyderabad");