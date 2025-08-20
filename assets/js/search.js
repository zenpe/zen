// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchOverlay = document.getElementById('search-overlay');
    const searchResults = document.getElementById('search-results');
    const closeSearchBtn = document.getElementById('close-search');
    const navbarCloseBtn = document.getElementById('navbar-close-btn');
    
    // Close navbar button
    if (navbarCloseBtn) {
        navbarCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const navbar = document.getElementById('main-navbar');
            if (navbar) navbar.style.display = 'none';
        });
    }
    
    // Initialize Algolia
    const appId = window.algoliaConfig ? window.algoliaConfig.appId : '';
    const apiKey = window.algoliaConfig ? window.algoliaConfig.apiKey : '';
    const indexName = window.algoliaConfig ? window.algoliaConfig.indexName : '';
    
    let searchClient, index;
    if (appId && apiKey && indexName) {
        // Dynamically load Algolia library if not already loaded
        if (typeof algoliasearch !== 'undefined') {
            searchClient = algoliasearch(appId, apiKey);
            index = searchClient.initIndex(indexName);
        } else {
            console.warn('Algolia library not loaded');
        }
    }

    // Handle search input for suggestions
    if (searchInput && index) {
        searchInput.addEventListener('input', function(e) {
            const term = e.target.value.trim();
            if (term.length > 0) {
                performSearch(term);
            } else {
                searchOverlay.style.display = 'none';
            }
        });
        
        // Close suggestions when clicking outside
        searchOverlay.addEventListener('click', function(e) {
            // If clicking on the overlay itself (not its internal elements) or close button, close the overlay
            if (e.target === searchOverlay) {
                searchOverlay.style.display = 'none';
            }
        });
        
        // Handle close button click event
        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', function(e) {
                e.preventDefault();
                searchOverlay.style.display = 'none';
            });
        }
        
        // Prevent form submission
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const term = searchInput.value.trim();
            if (term.length > 0) {
                performSearch(term);
            }
        });
    }
    
    async function performSearch(term) {
        if (!index) return;
        
        try {
            const { hits } = await index.search(term, {
                hitsPerPage: 6
            });
            displayResults(hits);
            searchOverlay.style.display = 'flex';
        } catch (e) {
            console.error("Search error:", e);
            searchResults.innerHTML = "<p class='no-results'>搜索出现错误，请稍后重试</p>";
            searchOverlay.style.display = 'flex';
        }
    }
    
    function displayResults(results) {
        if (results.length === 0) {
            searchResults.innerHTML = "<p class='no-results'>没有找到相关结果</p>";
            return;
        }
        
        let html = "";
        results.forEach((result) => {
            // Extract URL path for display
            const url = new URL(result.url, window.location.origin);
            const displayUrl = url.pathname;
            
            html += `
                <div class="search-result-item">
                    <h3><a href="${result.url}">${result.title}</a></h3>
                    <p>${result.excerpt || (result.content ? result.content.substring(0, 120) + '...' : '')}</p>
                    <span class="search-result-url">${displayUrl}</span>
                </div>
            `;
        });
        searchResults.innerHTML = html;
        
        // Add click handlers to links to close overlay when navigating
        const links = searchResults.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                searchOverlay.style.display = 'none';
            });
        });
    }
});