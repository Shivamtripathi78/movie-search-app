```javascript
const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";

// Add your TMDB API Read Access Token in a local config.js file.
// Never publish a real token in a public repository.
const API_TOKEN = window.TMDB_READ_ACCESS_TOKEN || "";

const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const movieGrid = document.querySelector("#movieGrid");
const statusMessage = document.querySelector("#statusMessage");
const statusText = document.querySelector("#statusText");
const loader = document.querySelector("#loader");
const resultsTitle = document.querySelector("#resultsTitle");
const resultsSubtitle = document.querySelector("#resultsSubtitle");
const resultsCount = document.querySelector("#resultsCount");
const loadMoreContainer = document.querySelector("#loadMoreContainer");
const loadMoreButton = document.querySelector("#loadMoreButton");
const movieDialog = document.querySelector("#movieDialog");
const movieDetails = document.querySelector("#movieDetails");
const dialogClose = document.querySelector("#dialogClose");

let currentQuery = "";
let currentPage = 1;
let totalPages = 1;
let isLoading = false;

document.querySelector("#currentYear").textContent =
    new Date().getFullYear();

function setStatus(message, showLoader = false) {
    statusText.textContent = message;
    loader.hidden = !showLoader;
    statusMessage.hidden = false;
}

function hideStatus() {
    statusMessage.hidden = true;
}

function setLoading(loading) {
    isLoading = loading;
    searchButton.disabled = loading;
    searchButton.textContent = loading ? "Searching..." : "Search →";
    loadMoreButton.disabled = loading;
}

function updateCount(count) {
    resultsCount.textContent =
        `${count} MOVIE${count === 1 ? "" : "S"}`;
}

async function apiRequest(endpoint) {
    if (!API_TOKEN) {
        throw new Error(
            "API token is missing. Configure your TMDB read-access token in config.js."
        );
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            Accept: "application/json"
        }
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error(
                "TMDB authentication failed. Check your API token and permissions."
            );
        }

        if (response.status === 429) {
            throw new Error(
                "Too many requests. Please wait a moment and try again."
            );
        }

        throw new Error(
            `The movie service returned an error (${response.status}). Please try again.`
        );
    }

    return response.json();
}

function createMovieCard(movie) {
    const card = document.createElement("article");
    card.className = "movie-card";

    const posterWrap = document.createElement("div");
    posterWrap.className = "poster-wrap";

    if (movie.poster_path) {
        const image = document.createElement("img");
        image.src = `${IMAGE_BASE}${movie.poster_path}`;
        image.alt = `${movie.title || movie.name || "Movie"} poster`;
        image.loading = "lazy";
        image.onerror = () => {
            image.remove();

            const placeholder = document.createElement("div");
            placeholder.className = "poster-placeholder";
            placeholder.textContent = "Poster unavailable";
            posterWrap.prepend(placeholder);
        };

        posterWrap.append(image);
    } else {
        const placeholder = document.createElement("div");
        placeholder.className = "poster-placeholder";
        placeholder.textContent = "No poster available";
        posterWrap.append(placeholder);
    }

    const rating = document.createElement("span");
    rating.className = "rating-badge";

    const vote = Number(movie.vote_average);
    rating.textContent =
        Number.isFinite(vote) && vote > 0
            ? `★ ${vote.toFixed(1)}`
            : "Not rated";

    posterWrap.append(rating);

    const info = document.createElement("div");
    info.className = "movie-info";

    const title = document.createElement("h3");
    title.textContent = movie.title || movie.name || "Untitled";

    const year = document.createElement("p");
    year.className = "movie-year";
    year.textContent = (movie.release_date || movie.first_air_date || "")
        .slice(0, 4) || "Release year unavailable";

    const overview = document.createElement("p");
    overview.className = "movie-overview";
    overview.textContent =
        movie.overview || "No overview is available for this title.";

    const detailsButton = document.createElement("button");
    detailsButton.type = "button";
    detailsButton.className = "details-button";
    detailsButton.textContent = "View Details →";
    detailsButton.addEventListener("click", () => {
        openMovieDetails(movie);
    });

    info.append(title, year, overview, detailsButton);
    card.append(posterWrap, info);

    return card;
}

function renderMovies(movies, append = false) {
    if (!append) {
        movieGrid.replaceChildren();
    }

    const fragment = document.createDocumentFragment();

    movies.forEach((movie) => {
        fragment.append(createMovieCard(movie));
    });

    movieGrid.append(fragment);

    hideStatus();
    updateCount(movieGrid.children.length);
}

async function fetchMovies({ query = "", page = 1, append = false } = {}) {
    if (isLoading) {
        return;
    }

    setLoading(true);
    setStatus(
        append ? "Finding more movies..." : "Searching the movie database...",
        true
    );

    try {
        const endpoint = query
            ? `/search/movie?query=${encodeURIComponent(query)}&page=${page}&include_adult=false`
            : `/movie/popular?page=${page}`;

        const data = await apiRequest(endpoint);
        const movies = Array.isArray(data.results) ? data.results : [];

        currentPage = data.page || page;
        totalPages = Math.min(data.total_pages || 1, 500);

        if (!append) {
            movieGrid.replaceChildren();
        }

        if (movies.length === 0 && !append) {
            updateCount(0);
            loadMoreContainer.hidden = true;
            setStatus(
                "No movies found. Try another title or check your spelling."
            );
            return;
        }

        renderMovies(movies, append);

        resultsTitle.textContent = query
            ? `Results for "${query}"`
            : "Popular Movies";

        resultsSubtitle.textContent = query
            ? "Explore the movies matching your search."
            : "Explore popular movies and find your next watch.";

        loadMoreContainer.hidden = currentPage >= totalPages;
    } catch (error) {
        console.error("Movie search error:", error);

        if (!append) {
            movieGrid.replaceChildren();
            updateCount(0);
        }

        loadMoreContainer.hidden = true;
        setStatus(error.message || "Something went wrong. Please try again.");
    } finally {
        setLoading(false);
    }
}

async function openMovieDetails(movie) {
    const title = movie.title || movie.name || "Movie Details";
    movieDetails.replaceChildren();

    const content = document.createElement("div");
    content.className = "dialog-content";

    const poster = document.createElement("img");
    poster.className = "dialog-poster";
    poster.alt = `${title} poster`;

    if (movie.poster_path) {
        poster.src = `${IMAGE_BASE}${movie.poster_path}`;
    } else {
        poster.hidden = true;
    }

    const information = document.createElement("div");

    const heading = document.createElement("h2");
    heading.id = "dialogTitle";
    heading.textContent = title;

    const meta = document.createElement("p");
    meta.className = "dialog-meta";

    const year = (movie.release_date || "").slice(0, 4);
    const rating = Number(movie.vote_average);
    const ratingText =
        Number.isFinite(rating) && rating > 0
            ? `★ ${rating.toFixed(1)}`
            : "Not rated";

    meta.textContent = [year, ratingText].filter(Boolean).join(" · ");

    const overview = document.createElement("p");
    overview.className = "dialog-overview";
    overview.textContent = movie.overview || "No overview available.";

    const extra = document.createElement("p");
    extra.className = "dialog-extra";
    extra.textContent = "Loading additional movie information...";

    information.append(heading, meta, overview, extra);
    content.append(poster, information);
    movieDetails.append(content);

    if (!movieDialog.open) {
        movieDialog.showModal();
    }

    try {
        const details = await apiRequest(`/movie/${movie.id}`);
        const genres = Array.isArray(details.genres)
            ? details.genres.map((genre) => genre.name).join(", ")
            : "";

        const runtime = details.runtime
            ? `${details.runtime} minutes`
            : "";

        const releaseDate = details.release_date || "";
        const language = details.original_language
            ? details.original_language.toUpperCase()
            : "";

        const items = [
            genres ? `Genres: ${genres}` : "",
            runtime ? `Runtime: ${runtime}` : "",
            releaseDate ? `Release date: ${releaseDate}` : "",
            language ? `Original language: ${language}` : ""
        ].filter(Boolean);

        extra.textContent = items.length
            ? items.join(" • ")
            : "Additional details are unavailable.";
    } catch (error) {
        console.error("Movie details error:", error);
        extra.textContent = "Additional details could not be loaded.";
    }
}

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = searchInput.value.trim();

    if (!query) {
        searchInput.focus();
        setStatus("Please enter a movie title to search.");
        return;
    }

    currentQuery = query;
    currentPage = 1;

    fetchMovies({
        query: currentQuery,
        page: 1,
        append: false
    });
});

loadMoreButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
        fetchMovies({
            query: currentQuery,
            page: currentPage + 1,
            append: true
        });
    }
});

dialogClose.addEventListener("click", () => {
    movieDialog.close();
});

movieDialog.addEventListener("click", (event) => {
    if (event.target === movieDialog) {
        movieDialog.close();
    }
});

searchInput.addEventListener("input", () => {
    if (searchInput.value.trim() === "") {
        currentQuery = "";
    }
});

// Load popular movies when the application starts.
fetchMovies({ query: "", page: 1, append: false });
```
