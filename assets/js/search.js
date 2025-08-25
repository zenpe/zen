
document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchOverlay = document.getElementById('search-overlay');
    const searchResults = document.getElementById('search-results');
    const closeSearchBtn = document.getElementById('close-search');
    const navbarCloseBtn = document.getElementById('navbar-close-btn');

    if (navbarCloseBtn) {
        navbarCloseBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const navbar = document.getElementById('main-navbar');
            if (navbar) navbar.style.display = 'none';
        });
    }

    let index;
    let documents = [];

    function loadFlexSearchLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof FlexSearch !== 'undefined') {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/flexsearch@0.7.31/dist/flexsearch.bundle.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load FlexSearch library'));
            document.head.appendChild(script);
        });
    }

    async function initializeFlexSearch() {
        try {
            await loadFlexSearchLibrary();
            const response = await fetch('/flexsearch.json');
            documents = await response.json();
            index = new FlexSearch.Document({
                document: {
                    id: "permalink",
                    index: ["title", "content"],
                    store: ["title", "excerpt", "permalink", "content"]
                },
                tokenize: "full"
            });
            documents.forEach(doc => index.add(doc));
            return true;
        } catch (error) {
            console.error('Failed to initialize FlexSearch:', error);
            return false;
        }
    }

    if (searchInput) {
        let flexSearchInitialized = false;

        searchInput.addEventListener('focus', async function () {
            if (!flexSearchInitialized) {
                flexSearchInitialized = await initializeFlexSearch();
                if (!flexSearchInitialized) {
                    searchResults.innerHTML = "<p class='no-results'>搜索功能初始化失败</p>";
                    searchOverlay.style.display = 'flex';
                    return;
                }
            }
        });

        searchInput.addEventListener('input', function (e) {
            const term = e.target.value.trim();
            if (term.length > 0) {
                performSearch(term);
            } else {
                searchOverlay.style.display = 'none';
            }
        });

        searchOverlay.addEventListener('click', function (e) {
            if (e.target === searchOverlay) {
                searchOverlay.style.display = 'none';
            }
        });

        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', function (e) {
                e.preventDefault();
                searchOverlay.style.display = 'none';
            });
        }

        searchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const term = searchInput.value.trim();
            if (term.length > 0) {
                performSearch(term);
            }
        });
    }

    function performSearch(term) {
        if (!index) return;
        const results = index.search(term, { limit: 6, enrich: true });
        displayResults(results[0] ? results[0].result : []);
        searchOverlay.style.display = 'flex';
    }

    function displayResults(results) {
        if (results.length === 0) {
            searchResults.innerHTML = "<p class='no-results'>没有找到相关结果</p>";
            return;
        }

        const term = searchInput.value.trim();

        const html = results.map((result) => {
            const doc = result.doc;
            const url = new URL(doc.permalink, window.location.origin);
            const displayUrl = url.pathname;

            const title = highlight(doc.title, term);
            const excerptContent = doc.excerpt || createExcerpt(doc.content, term);
            const excerpt = highlight(excerptContent, term);

            return `
                <div class="search-result-item">
                    <h3><a href="${doc.permalink}">${title}</a></h3>
                    <p>${excerpt}</p>
                    <span class="search-result-url">${displayUrl}</span>
                </div>
            `;
        }).join('');

        searchResults.innerHTML = html;

        const links = searchResults.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                searchOverlay.style.display = 'none';
            });
        });
    }

    function createExcerpt(content, term, maxLength = 120) {
        if (!content) {
            return '';
        }

        const termIndex = content.toLowerCase().indexOf(term.toLowerCase());
        if (termIndex === -1) {
            return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
        }

        const start = Math.max(0, termIndex - Math.floor(maxLength / 2));
        const end = Math.min(content.length, termIndex + term.length + Math.floor(maxLength / 2));

        let excerpt = content.substring(start, end);
        if (start > 0) {
            excerpt = '...' + excerpt;
        }
        if (end < content.length) {
            excerpt = excerpt + '...';
        }

        return excerpt;
    }

    function highlight(text, term) {
        if (!text || !term) {
            return text;
        }
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<strong class="search-highlight">$1</strong>');
    }
});
