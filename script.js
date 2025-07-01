const API_BASE = 'https://animex-nu-umber.vercel.app';
const sections = {
    trending: document.getElementById('trending-section'),
    popular: document.getElementById('popular-section'),
    schedule: document.getElementById('schedule-section'),
    bookmarks: document.getElementById('bookmarks-section'),
    search: document.getElementById('search-results-section')
};
const navLinks = document.querySelectorAll('nav ul li a');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const themeToggle = document.getElementById('theme-toggle');
const animeModal = document.getElementById('anime-modal');
const playerModal = document.getElementById('player-modal');
const closeBtns = document.querySelectorAll('.close-btn');

let currentAnimeId = null;
let currentEpisodeId = null;
let currentSearchQuery = '';
let currentSearchPage = 1;
let totalSearchPages = 1;

document.addEventListener('DOMContentLoaded', () => {
    loadTrendingAnime();
    loadPopularAnime();
    loadAiringSchedule();
    loadBookmarks();
    setupEventListeners();
    loadTheme();
});

function setupEventListeners() {
    searchButton.addEventListener('click', searchAnime);
    searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && searchAnime());
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            e.target.classList.add('active');
            
            Object.values(sections).forEach(sec => sec.classList.remove('active-section'));
            sections[e.target.dataset.section].classList.add('active-section');
            
            if (e.target.dataset.section === 'trending' && !sections.trending.querySelector('.anime-card')) {
                loadTrendingAnime();
            } else if (e.target.dataset.section === 'popular' && !sections.popular.querySelector('.anime-card')) {
                loadPopularAnime();
            } else if (e.target.dataset.section === 'schedule' && !sections.schedule.querySelector('.schedule-card')) {
                loadAiringSchedule();
            } else if (e.target.dataset.section === 'bookmarks') {
                loadBookmarks();
            }
        });
    });
    
    closeBtns.forEach(btn => btn.addEventListener('click', () => {
        animeModal.style.display = 'none';
        playerModal.style.display = 'none';
    }));
    
    window.addEventListener('click', (e) => {
        if (e.target === animeModal) animeModal.style.display = 'none';
        if (e.target === playerModal) playerModal.style.display = 'none';
    });
    
    themeToggle.addEventListener('click', toggleTheme);
}

async function fetchAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) throw new Error('API request failed');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

async function loadTrendingAnime() {
    const trendingGrid = document.getElementById('trending-anime');
    trendingGrid.innerHTML = '<div class="loader"></div>';
    
    const data = await fetchAPI('/meta/anilist/trending');
    if (data?.results) {
        trendingGrid.innerHTML = '';
        data.results.slice(0, 12).forEach(anime => trendingGrid.appendChild(createAnimeCard(anime)));
    } else {
        trendingGrid.innerHTML = '<p>Failed to load trending anime</p>';
    }
}

async function loadPopularAnime() {
    const popularGrid = document.getElementById('popular-anime');
    popularGrid.innerHTML = '<div class="loader"></div>';
    
    const data = await fetchAPI('/meta/anilist/popular');
    if (data?.results) {
        popularGrid.innerHTML = '';
        data.results.slice(0, 12).forEach(anime => popularGrid.appendChild(createAnimeCard(anime)));
    } else {
        popularGrid.innerHTML = '<p>Failed to load popular anime</p>';
    }
}

async function loadAiringSchedule() {
    const scheduleGrid = document.getElementById('schedule-anime');
    scheduleGrid.innerHTML = '<div class="loader"></div>';
    
    const data = await fetchAPI('/meta/anilist/airing-schedule');
    if (data?.results) {
        scheduleGrid.innerHTML = '';
        data.results.slice(0, 12).forEach(show => scheduleGrid.appendChild(createScheduleCard(show)));
    } else {
        scheduleGrid.innerHTML = '<p>Failed to load schedule</p>';
    }
}

function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.dataset.id = anime.id;
    
    const title = anime.title?.romaji || anime.title?.userPreferred || anime.title?.english || 'No title';
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '{}');
    
    card.innerHTML = `
        <img src="${anime.image}" alt="${title}" class="anime-poster">
        <div class="anime-info">
            <div class="anime-title">${title}</div>
            <div class="anime-meta">
                <span>${anime.type || 'Unknown'}</span>
                <span>${anime.totalEpisodes || '?'} eps</span>
            </div>
        </div>
        <button class="bookmark-btn ${bookmarks[anime.id] ? 'bookmarked' : ''}" data-id="${anime.id}">
            <i class="fas fa-bookmark"></i>
        </button>
    `;
    
    card.addEventListener('click', () => showAnimeDetails(anime.id));
    card.querySelector('.bookmark-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBookmark(anime.id, e.target.closest('.bookmark-btn'));
    });
    
    return card;
}

function createScheduleCard(show) {
    const card = document.createElement('div');
    card.className = 'schedule-card';
    card.dataset.id = show.id;
    
    const title = show.title?.romaji || show.title?.userPreferred || show.title?.english || 'No title';
    const airingTime = new Date(show.airingAt * 1000).toLocaleString();
    
    card.innerHTML = `
        <img src="${show.image}" alt="${title}" class="schedule-poster">
        <div class="schedule-info">
            <div class="schedule-title">${title}</div>
            <div class="schedule-meta">
                <span>Ep ${show.episode}</span>
                <span class="schedule-time">${airingTime}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => showAnimeDetails(show.id));
    return card;
}

async function searchAnime() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    currentSearchQuery = query;
    currentSearchPage = 1;
    
    const searchResults = document.getElementById('search-results');
    const searchPagination = document.getElementById('search-pagination');
    
    searchResults.innerHTML = '<div class="loader"></div>';
    searchPagination.innerHTML = '';
    
    Object.values(sections).forEach(sec => sec.classList.remove('active-section'));
    sections.search.classList.add('active-section');
    
    const data = await fetchAPI(`/meta/anilist/${encodeURIComponent(query)}?page=${currentSearchPage}`);
    
    if (data?.results?.length) {
        searchResults.innerHTML = '';
        data.results.forEach(anime => searchResults.appendChild(createAnimeCard(anime)));
        totalSearchPages = data.totalPages || 1;
        updatePagination(searchPagination, currentSearchPage, totalSearchPages);
    } else {
        searchResults.innerHTML = '<p>No results found</p>';
    }
}

function updatePagination(paginationElement, currentPage, totalPages) {
    paginationElement.innerHTML = '';
    
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&laquo;';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) loadSearchPage(currentPage - 1);
    });
    paginationElement.appendChild(prevButton);
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        if (i === currentPage) pageButton.classList.add('active');
        pageButton.addEventListener('click', () => loadSearchPage(i));
        paginationElement.appendChild(pageButton);
    }
    
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '&raquo;';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) loadSearchPage(currentPage + 1);
    });
    paginationElement.appendChild(nextButton);
}

async function loadSearchPage(page) {
    currentSearchPage = page;
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '<div class="loader"></div>';
    
    const data = await fetchAPI(`/meta/anilist/${encodeURIComponent(currentSearchQuery)}?page=${page}`);
    
    if (data?.results) {
        searchResults.innerHTML = '';
        data.results.forEach(anime => searchResults.appendChild(createAnimeCard(anime)));
        updatePagination(document.getElementById('search-pagination'), page, data.totalPages || 1);
    } else {
        searchResults.innerHTML = '<p>Failed to load results</p>';
    }
}

async function showAnimeDetails(animeId) {
    animeModal.style.display = 'block';
    document.getElementById('anime-detail-content').innerHTML = '<div class="loader"></div>';
    
    const anime = await fetchAPI(`/meta/anilist/info/${animeId}`);
    if (!anime) {
        document.getElementById('anime-detail-content').innerHTML = '<p>Failed to load details</p>';
        return;
    }
    
    const title = anime.title?.romaji || anime.title?.userPreferred || anime.title?.english || 'No title';
    const japaneseTitle = anime.title?.native || '';
    
    document.getElementById('anime-detail-content').innerHTML = `
        <div class="detail-header">
            <img src="${anime.image}" alt="${title}" class="detail-poster">
            <div class="detail-info">
                <h1 class="detail-title">${title} <small>${japaneseTitle}</small></h1>
                <div class="detail-meta">
                    <span><i class="fas fa-tv"></i> ${anime.type || 'Unknown'}</span>
                    <span><i class="fas fa-list-ol"></i> ${anime.totalEpisodes || '?'} episodes</span>
                    <span><i class="fas fa-star"></i> ${anime.rating ? `${anime.rating}%` : 'N/A'}</span>
                    <span><i class="fas fa-calendar"></i> ${anime.releaseDate || 'Unknown'}</span>
                    <span><i class="fas fa-info-circle"></i> ${anime.status || 'Unknown'}</span>
                </div>
                <div class="detail-genres">
                    ${(anime.genres || []).map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                </div>
                <p class="detail-description">${anime.description || 'No description available.'}</p>
            </div>
        </div>
        <div class="episodes-section">
            <h3>Episodes</h3>
            <div class="episodes-list" id="episodes-list">
                ${Array.from({length: anime.totalEpisodes || 0}, (_, i) => `
                    <button class="episode-btn" data-id="${animeId}$episode$${i+1}">
                        Ep ${i+1}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.querySelectorAll('.episode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentEpisodeId = btn.dataset.id;
            playEpisode(currentEpisodeId);
        });
    });
}

async function playEpisode(episodeId) {
    playerModal.style.display = 'block';
    videoPlayer.innerHTML = '<div class="loader"></div>';
    
    const data = await fetchAPI(`/anime/zoro/watch/${episodeId}?server=vidcloud`);
    if (data?.sources?.[0]?.url) {
        videoPlayer.innerHTML = `<iframe src="${data.sources[0].url}" frameborder="0" allowfullscreen></iframe>`;
        saveToHistory(episodeId);
    } else {
        videoPlayer.innerHTML = '<p>No video source available</p>';
    }
}

function toggleBookmark(animeId, button) {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '{}');
    if (bookmarks[animeId]) {
        delete bookmarks[animeId];
        button.classList.remove('bookmarked');
    } else {
        bookmarks[animeId] = true;
        button.classList.add('bookmarked');
    }
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    loadBookmarks();
}

function loadBookmarks() {
    const bookmarksGrid = document.getElementById('bookmarks-grid');
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '{}');
    const bookmarkIds = Object.keys(bookmarks);
    
    if (!bookmarkIds.length) {
        bookmarksGrid.innerHTML = '<p>No bookmarks yet</p>';
        return;
    }
    
    bookmarksGrid.innerHTML = '<div class="loader"></div>';
    
    Promise.all(bookmarkIds.map(id => fetchAPI(`/meta/anilist/info/${id}`)))
        .then(animeList => {
            bookmarksGrid.innerHTML = '';
            animeList.filter(anime => anime).forEach(anime => {
                bookmarksGrid.appendChild(createAnimeCard(anime));
            });
        })
        .catch(() => {
            bookmarksGrid.innerHTML = '<p>Failed to load bookmarks</p>';
        });
}

function saveToHistory(episodeId) {
    const history = JSON.parse(localStorage.getItem('history') || '{}');
    history[episodeId] = new Date().toISOString();
    localStorage.setItem('history', JSON.stringify(history));
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
}
