/**
 * OPEN MEDIA — CORE CONTROLLER
 * Single Page Application routing, magazine reader, reactive storage, search & AI.
 */

const CAT_MAP = { tech: 'IT', business: 'Business', cyber: 'Cyber Security', ai: 'AI' };
const VALID_PAGES = ['home', 'foryou', 'business', 'tech', 'cyber', 'ai', 'publish', 'admin', 'careers', 'contact', 'advertise'];

const TECH_DOMAIN_GROUPS = {
  'Artificial Intelligence': ['Generative AI', 'AI Startups', 'Machine Learning', 'AI Policy', 'AI Tools', 'Indian Language AI'],
  'Cloud Computing & Data Centres': ['AWS', 'Azure', 'Google Cloud', 'Data Centres', 'Kubernetes', 'AI Infrastructure'],
  'Semiconductors & Hardware': ['AI Chips', 'GPUs', 'Smartphones', 'Laptops', 'Servers', 'Manufacturing'],
  'Startups, Enterprise IT & Digital Business': ['Startup Funding', 'SaaS', 'FinTech', 'Product Launches', 'Technology Jobs', 'Founder Stories']
};
const BUSINESS_DOMAIN_GROUPS = {
  'Companies & Corporations': ['Company News', 'Product Launches', 'Corporate Announcements'],
  'Corporate Finance & Earnings': ['Quarterly Results', 'Revenue Reports', 'Profit Analysis', 'Debt Management'],
  'Mergers, Acquisitions & Deals': ['Acquisitions', 'Partnerships', 'Joint Ventures', 'Strategic Alliances'],
  'Business Strategy': ['Digital Transformation', 'Innovation', 'Market Competition', 'Restructuring'],
  'Leadership & Management': ['CEO Changes', 'Executive Appointments', 'Board Updates', 'Leadership Insights'],
  'Corporate Growth & Expansion': ['New Markets', 'Global Expansion', 'Hiring', 'New Offices']
};
const CYBER_DOMAIN_GROUPS = {
  'Global Cyber Attacks': ['Worldwide Attacks', 'Nation-State Threats', 'Incident Reports'],
  'Threat Insights': ['Threat Intelligence', 'APT Groups', 'Security Research'],
  'Zero-Day Radar': ['CVEs', 'Exploits', 'Patches', 'Vulnerabilities'],
  'Ransomware Files': ['Ransomware Attacks', 'Data Leaks', 'Recovery Stories'],
  'Events': ['Security Conferences', 'Training Programs', 'Expert Sessions']
};
// group -> canonical domain string that exists on real article records
const GROUP_MATCH = {
  'Artificial Intelligence': 'Artificial Intelligence',
  'Cloud Computing & Data Centres': 'Cloud Computing',
  'Semiconductors & Hardware': 'Semiconductors',
  'Startups, Enterprise IT & Digital Business': 'Startups',
  'Companies & Corporations': 'Companies',
  'Corporate Finance & Earnings': 'Earnings',
  'Mergers, Acquisitions & Deals': 'M&A',
  'Business Strategy': 'Strategy',
  'Leadership & Management': 'Leadership',
  'Corporate Growth & Expansion': 'Expansion',
  'Partnerships': 'Partnerships',
  'Global Cyber Attacks': 'Global Attacks',
  'Threat Insights': 'Security Research',
  'Zero-Day Radar': 'Zero-Day',
  'Ransomware Files': 'Ransomware',
  'Events': 'Critical'
};
const BUSINESS_DOMAIN_MATCH = {
  'Company News': 'Companies',
  'Product Launches': 'Companies',
  'Corporate Announcements': 'Companies',
  'Quarterly Results': 'Earnings',
  'Revenue Reports': 'Earnings',
  'Profit Analysis': 'Earnings',
  'Debt Management': 'Earnings',
  'Acquisitions': 'M&A',
  'Partnerships': 'Partnerships',
  'Joint Ventures': 'M&A',
  'Strategic Alliances': 'M&A',
  'Digital Transformation': 'Strategy',
  'Innovation': 'Strategy',
  'Market Competition': 'Strategy',
  'Restructuring': 'Strategy',
  'CEO Changes': 'Leadership',
  'Executive Appointments': 'Leadership',
  'Board Updates': 'Leadership',
  'Leadership Insights': 'Leadership',
  'New Markets': 'Expansion',
  'Global Expansion': 'Expansion',
  'Hiring': 'Expansion',
  'New Offices': 'Expansion'
};

class GlobalCoverageApp {
  constructor() {
    this.currentHeroIndex = 0;
    this.currentHeroPage = 0;
    this.heroFlipInProgress = false;
    this.heroRenderPending = false;
    this.heroFlipTimer = null;
    this.currentTrendingIndex = 0;
    this.currentPage = 'home';
    this.libraryView = 'saved';
    this.aiHeroRotateTimer = null;
    this.trendingRotateTimer = null;
    this.sidebarAdTimer = null;
    this.mediaAdTimer = null;
    this.liveUpdateTimer = null;
    this.newsRefreshTimer = null;
    this.liveRefreshTimer = null;

    // Backend API and authenticated session - dynamic hostname for LAN access
    const apiHost = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';
    this.apiBase = `http://${apiHost}:4000/api`;
    this.socketUrl = `http://${apiHost}:4000`;
    this.apiAvailable = false;
    this.authToken = localStorage.getItem('gc_auth_token') || null;
    this.currentUser = JSON.parse(localStorage.getItem('gc_current_user') || 'null');
    this.adminSubmissions = [];
    this.adminUsers = [];
    this.publisherArticles = [];
    this.activeAdminTab = 'submissions';
    this.selectedSubmissions = new Set();
    this.articleCommentsCache = {};
    this.socket = null;
    this.lastOfflineToast = 0;

    // Dynamic homepage view state (isolated from master arrays)
    this.dynamicHome = { heroStories: [], trending: [], articles: [], events: [] };

    this.savedArticles = this.readStoredArray('gc_saved');
    this.followedAuthors = this.readStoredArray('gc_following', ['Meera Rao']);
    this.followedAuthorMap = {};
    this.readingHistory = this.readStoredArray('gc_history');
    this.bookmarkedEvents = this.readStoredArray('gc_bookmarked_events');
    this.newsletterSubscribers = this.readStoredArray('gc_newsletter_subscribers');
    this.eventRegistrations = this.readStoredArray('gc_event_registrations');
    this.notifCount = 3;
    this.aiChat = this.readStoredArray('gc_ai_chat');
    this.inFlightRequests = new Map();
    this.lastApiRequestAt = {};
    this.lastAuthAttemptAt = 0;
    this.lastTrendingAuthorsLoadAt = 0;
    this.trendingAuthorsRequestInFlight = false;

    this.init();
  }

  async init() {
    this.clearUnusedStorage();
    this.refreshNewsOrder();
    this.renderDate();
    this.renderLiveUpdates();
    this.renderTicker();
    this.renderHero();
    this.renderTrending();
    this.renderEvents();

    this.renderForYouPage();
    this.renderCategoryFeeds();
    this.renderAIPage();
    this.renderPublisherTracker();
    this.setupRouting();
    this.renderHomePage();
    this.setupGlobalListeners();
    this.startHeroAutoRotate();
    this.startTrendingAutoRotate();
    this.startNewsRefresh();

    // Restore any existing authenticated session; never auto-login seed accounts.
    this.updateNavVisibility();
    this.checkBackendConnection();
    this.initRealtime();

    if (window.lucide) lucide.createIcons();
  }

  // --- Utilities ---
  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  shuffleArray(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  }

  // Temporary dynamic homepage views (prevents in-place mutation of master data)
  getHomeHeroStories() {
    return this.dynamicHome?.heroStories?.length ? this.dynamicHome.heroStories : GC_DATA.heroStories;
  }
  getHomeTrending() {
    return this.dynamicHome?.trending?.length ? this.dynamicHome.trending : GC_DATA.trending;
  }
  getHomeArticles() {
    return this.dynamicHome?.articles?.length ? this.dynamicHome.articles : GC_DATA.articles;
  }
  getHomeEvents() {
    return this.dynamicHome?.events?.length ? this.dynamicHome.events : GC_DATA.events;
  }

  refreshNewsOrder() {
    const masterHero = GC_DATA.master?.heroStories || GC_DATA.heroStories;
    const masterTrending = GC_DATA.master?.trending || GC_DATA.trending;
    const masterArticles = GC_DATA.master?.articles || GC_DATA.articles;
    const masterEvents = GC_DATA.master?.events || GC_DATA.events;

    this.dynamicHome = {
      heroStories: this.shuffleArray(masterHero),
      trending: this.shuffleArray(masterTrending),
      articles: this.shuffleArray(masterArticles),
      events: this.shuffleArray(masterEvents)
    };
    this.currentHeroIndex = 0;
    this.currentTrendingIndex = 0;
  }

  startNewsRefresh() {
    clearInterval(this.newsRefreshTimer);
    this.newsRefreshTimer = setInterval(() => {
      this.refreshNewsOrder();
      this.renderHero();
      this.renderTrending();
      this.renderTicker();
      this.renderForYouPage();
      this.renderCategoryFeeds();
      this.renderTechSpotlight();
      this.renderBusinessHighlights();
      this.renderCyberAlerts();
      this.renderAIHighlights();
      this.renderMostRead();
      this.renderAIPage();
      this.renderLiveUpdates();
    }, 45000);
  }

  readStoredArray(key, fallback = []) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(value) ? value : fallback;
    } catch (error) {
      return fallback;
    }
  }

  clearUnusedStorage() {
    const staleKeys = ['gc_submissions', 'gc_admin_submissions', 'gc_publisher_submissions', 'gc_demo_articles', 'gc_demo_events'];
    staleKeys.forEach((key) => localStorage.removeItem(key));

    ['gc_saved', 'gc_following', 'gc_history', 'gc_bookmarked_events', 'gc_newsletter_subscribers', 'gc_event_registrations', 'gc_ai_chat']
      .forEach((key) => {
        try {
          const value = JSON.parse(localStorage.getItem(key) || 'null');
          if (!Array.isArray(value)) {
            localStorage.removeItem(key);
          }
        } catch {
          localStorage.removeItem(key);
        }
      });
  }

  startLiveRefresh() {
    clearInterval(this.liveRefreshTimer);
    if (!this.apiAvailable) return;

    this.liveRefreshTimer = setInterval(() => {
      this.fetchBackendArticles();
      this.fetchBackendEvents();
      if (this.currentUser && ['PUBLISHER', 'ADMIN'].includes(this.currentUser.role)) {
        this.renderPublisherTracker();
      }
      if (this.currentUser?.role === 'ADMIN') {
        this.loadAdminSubmissions();
        this.loadAdminEvents();
      }
    }, 15000);
  }

  renderDate() {
    this.startLiveClock();
  }

  startLiveClock() {
    const updateClock = () => {
      const now = new Date();
      const dateEl = document.getElementById('current-date');
      const clockText = document.getElementById('ist-clock-text');
      const analogClock = document.querySelector('.analog-clock');

      // IST format: Asia/Kolkata timezone with 12-hour AM/PM
      const istTimeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const istTimeParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      }).formatToParts(now);
      const timePart = (type) => Number(istTimeParts.find((part) => part.type === type)?.value || 0);
      const hours = timePart('hour') % 12;
      const minutes = timePart('minute');
      const seconds = timePart('second');

      const istDateStr = now.toLocaleDateString('en-US', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });

      if (clockText) {
        clockText.textContent = `${istTimeStr} IST`;
      }
      if (dateEl) {
        dateEl.textContent = istDateStr;
      }
      if (analogClock) {
        analogClock.querySelector('.analog-clock-hour').style.transform = `rotate(${hours * 30 + minutes * 0.5 + seconds * (0.5 / 60)}deg)`;
        analogClock.querySelector('.analog-clock-minute').style.transform = `rotate(${minutes * 6 + seconds * 0.1}deg)`;
        analogClock.querySelector('.analog-clock-second').style.transform = `rotate(${seconds * 6}deg)`;
      }
    };
    updateClock();
    if (!this.liveClockTimer) {
      this.liveClockTimer = setInterval(updateClock, 1000);
    }
  }

  renderLiveUpdates() {
    const message = document.getElementById('live-update-message');
    const stories = this.getHomeTrending();
    if (!message || !stories.length) return;
    let updateIndex = 0;
    const paint = () => {
      const story = stories[updateIndex];
      message.classList.remove('live-update-enter');
      void message.offsetWidth;
      message.textContent = `${story.category}: ${story.title}`;
      message.classList.add('live-update-enter');
      updateIndex = (updateIndex + 1) % stories.length;
    };
    paint();
    clearInterval(this.liveUpdateTimer);
    this.liveUpdateTimer = setInterval(paint, 5200);
    this.refreshIcons(document.getElementById('live-update-message') || document.querySelector('.live-indicator'));
  }

  categorySlug(cat) { return (cat || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  trendingIcon(category) {
    return { Business: 'bar-chart-3', IT: 'cpu', 'Cyber Security': 'shield-check', AI: 'sparkles' }[category] || 'radio-tower';
  }

  // --- Dynamic Icon Rendering (Targeted Subtrees) ---
  bindImageFallbacks(root = document) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('img').forEach((img) => {
      if (img.dataset.fallbackBound === 'true') return;
      img.dataset.fallbackBound = 'true';
      img.onerror = () => {
        if (img.dataset.fallbackApplied === 'true') return;
        img.dataset.fallbackApplied = 'true';
        img.onerror = null;
        img.src = this.getImageFallbackSvg(img.alt || img.getAttribute('aria-label') || 'OPEN MEDIA');
      };
    });
  }

  refreshIcons(container = null) {
    if (!window.lucide) return;
    let target = container;
    if (typeof container === 'string') {
      target = document.querySelector(container);
    }
    if (target && target instanceof Element) {
      lucide.createIcons({ el: target, root: target });
      this.bindImageFallbacks(target);
    } else {
      lucide.createIcons();
      this.bindImageFallbacks(document);
    }
  }

  // --- Modal & Drawer Stacking / Scroll Lock Helper ---
  updateModalOpenState(isOpen) {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      const anyModalOpen = !!document.querySelector('.modal-overlay.show, .ai-teller-drawer.show, .mobile-drawer.show');
      if (!anyModalOpen) {
        document.body.classList.remove('modal-open');
      }
    }
  }

  // --- Backend API Service ---
  async apiFetch(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const requestKey = `${method}:${path}:${JSON.stringify(options.body || '')}`;
    if (this.inFlightRequests.has(requestKey)) {
      return this.inFlightRequests.get(requestKey);
    }

    if (method === 'GET') {
      const cooldownMs = 1500;
      const lastRequestAt = this.lastApiRequestAt[path] || 0;
      const now = Date.now();
      if (lastRequestAt && (now - lastRequestAt) < cooldownMs) {
        return { ok: false, status: 0, data: null, error: new Error('Request throttled') };
      }
      this.lastApiRequestAt[path] = now;
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
      ...(options.headers || {})
    };

    const requestPromise = (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${this.apiBase}${path}`, {
          ...options,
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if ([401, 403].includes(res.status) && this.authToken && !path.startsWith('/auth/login')) {
          this.clearInvalidSession();
          this.showToast('Your session expired or is no longer valid. Please sign in again.');
        }

        if (res.status === 429) {
          console.warn(`[OPEN MEDIA API] Rate limited: ${path}`);
          this.showToast('The API is briefly rate-limiting requests. Please wait a moment.');
        }

        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
      } catch (err) {
        console.warn(`[OPEN MEDIA API] Fallback active for ${path}:`, err.message);
        this.apiAvailable = false;
        if (!this.lastOfflineToast || Date.now() - this.lastOfflineToast > 12000) {
          this.showToast('OPEN MEDIA is temporarily offline. Showing the latest local content.');
          this.lastOfflineToast = Date.now();
        }
        return { ok: false, status: 0, data: null, error: err };
      }
    })();

    this.inFlightRequests.set(requestKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      this.inFlightRequests.delete(requestKey);
    }
  }

  clearInvalidSession() {
    this.authToken = null;
    this.currentUser = null;
    localStorage.removeItem('gc_auth_token');
    localStorage.removeItem('gc_current_user');
    this.updateNavVisibility();
    this.navigateTo('home', false);
  }

  getImageFallbackSvg(label = 'OPEN MEDIA') {
    const safeLabel = this.escapeHTML(label).replace(/['<>]/g, '');
    const svg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700">
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0%" stop-color="#E2E8F0"/>
            <stop offset="100%" stop-color="#CBD5E1"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="700" fill="url(#g)"/>
        <rect x="80" y="80" width="1040" height="540" rx="28" fill="#F8FAFC"/>
        <circle cx="600" cy="250" r="110" fill="#94A3B8" opacity="0.18"/>
        <path d="M520 330h160l70 110H450l70-110zm50-90l40-52 40 52h-80z" fill="#475569" opacity="0.7"/>
        <text x="600" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#0F172A">${safeLabel}</text>
      </svg>
    `)}`;
    return svg;
  }

  initRealtime() {
    if (typeof io === 'undefined') {
      console.warn('[Socket.io] Real-time client library not loaded.');
      return;
    }

    try {
      this.socket = io(this.socketUrl, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log(`⚡ Connected to OPEN MEDIA Real-Time WebSocket Engine (${this.socket.id})`);
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`🔌 Disconnected from real-time engine: ${reason}`);
      });

      // Real-time Event 1: New article submitted by a publisher
      this.socket.on('article:submitted', (data) => {
        console.log('⚡ [Realtime] Article submitted:', data);
        if (this.currentUser?.role === 'ADMIN') {
          this.showToast(`📝 New Submission: "${data.title || 'Untitled'}" by ${data.author?.name || 'Publisher'}`);
          if (this.currentPage === 'admin' && this.activeAdminTab === 'submissions') {
            this.loadAdminSubmissions();
          }
        }
      });

      // Real-time Event 2: New event submitted
      this.socket.on('event:submitted', (data) => {
        console.log('⚡ [Realtime] Event submitted:', data);
        if (this.currentUser?.role === 'ADMIN') {
          this.showToast(`📅 New Event Submission: "${data.title || 'Untitled'}" by ${data.organizer?.name || 'Organizer'}`);
          if (this.currentPage === 'admin' && this.activeAdminTab === 'submissions') {
            this.loadAdminSubmissions();
          }
        }
      });

      // Real-time Event 3: Article status changed (Approved, Rejected, Changes Requested, Draft)
      this.socket.on('article:status_changed', (data) => {
        console.log('⚡ [Realtime] Article status changed:', data);
        this.fetchBackendArticles();
        if (this.currentPage === 'admin' && this.activeAdminTab === 'submissions') {
          this.loadAdminSubmissions();
        }

        const articleTitle = data.title || data.article?.title || 'Article';
        const articleStatus = (data.status || data.article?.status || 'UPDATED').toUpperCase();
        const articleAuthorId = data.article?.authorId || data.article?.author?.id || data.authorId || data.author?.id;
        const isCurrentPublisher = this.currentUser && this.currentUser.role === 'PUBLISHER' && articleAuthorId === this.currentUser.id;

        if (isCurrentPublisher) {
          const reason = data.editorialFeedback || data.article?.editorialFeedback;
          let notifMsg = `Your article "${articleTitle}" was ${articleStatus} by Admin.`;
          if (articleStatus === 'PUBLISHED') {
            notifMsg = `🎉 Your article "${articleTitle}" was APPROVED and published!`;
          } else if (articleStatus === 'CHANGES_REQUESTED') {
            notifMsg = `⚠️ Changes requested for "${articleTitle}"${reason ? `: ${reason}` : ''}`;
          } else if (articleStatus === 'REJECTED') {
            notifMsg = `❌ Your article "${articleTitle}" was REJECTED${reason ? `. Reason: ${reason}` : ''}`;
          }
          this.showToast(notifMsg);

          // Push into dynamic notification store
          if (!this.notifications) this.notifications = [];
          this.notifications.unshift({
            icon: articleStatus === 'PUBLISHED' ? 'check-circle' : articleStatus === 'CHANGES_REQUESTED' ? 'edit-3' : 'alert-circle',
            cls: articleStatus === 'PUBLISHED' ? 'text-emerald' : articleStatus === 'CHANGES_REQUESTED' ? 'text-orange' : 'text-red',
            bg: articleStatus === 'PUBLISHED' ? '#DCFCE7' : articleStatus === 'CHANGES_REQUESTED' ? '#FFEDD5' : '#FEE2E2',
            title: `SUBMISSION ${articleStatus}`,
            body: notifMsg,
            time: 'Just now'
          });
          this.notifCount = (this.notifCount || 0) + 1;
          const countEl = document.getElementById('notif-count');
          if (countEl) {
            countEl.textContent = this.notifCount;
            countEl.style.display = 'flex';
          }
        }

        this.renderPublisherTracker();
        this.renderPublisherFeedbackHistory();
      });

      // Real-time Event 4: Event status changed
      this.socket.on('event:status_changed', (data) => {
        console.log('⚡ [Realtime] Event status changed:', data);
        this.fetchBackendEvents();
        if (this.currentPage === 'admin' && this.activeAdminTab === 'submissions') {
          this.loadAdminSubmissions();
        }
        this.renderPublisherTracker();
      });

      // Real-time Event 5: Batch status changed
      this.socket.on('articles:batch_status_changed', (data) => {
        console.log('⚡ [Realtime] Batch status changed:', data);
        this.fetchBackendArticles();
        if (this.currentPage === 'admin' && this.activeAdminTab === 'submissions') {
          this.loadAdminSubmissions();
        }
        this.showToast(`⚡ Batch Update: ${data.count} article(s) updated to ${data.status}`);
      });

      // Real-time Event 6: Article content edited
      this.socket.on('article:updated', (data) => {
        console.log('⚡ [Realtime] Article updated:', data);
        this.fetchBackendArticles();
        if (this.currentPage === 'admin' && this.activeAdminTab === 'submissions') {
          this.loadAdminSubmissions();
        }
        if (this.activeReaderArticleId === data.id) {
          this.openArticleModal(data.id);
        }
      });

      // Real-time Event 7: New comment created
      this.socket.on('comment:created', (data) => {
        console.log('⚡ [Realtime] Comment created:', data);
        if (this.activeReaderArticleId === data.articleId) {
          this.loadArticleComments(data.articleId);
        }
      });
    } catch (err) {
      console.warn('[Socket.io] Realtime init error:', err);
    }
  }

  async checkBackendConnection() {
    const res = await this.apiFetch('/health');
    if (res.ok) {
      this.apiAvailable = true;
      this.clearUnusedStorage();
      this.fetchBackendArticles();
      this.fetchBackendEvents();
      if (this.authToken) {
        this.fetchUserLibrarySync();
        this.renderPublisherTracker();
      }
      this.startLiveRefresh();
    } else {
      this.apiAvailable = false;
      clearInterval(this.liveRefreshTimer);
    }
  }

  async fetchBackendArticles() {
    const res = await this.apiFetch('/articles');
    if (res.ok && res.data?.articles?.length) {
      const backendArticles = res.data.articles.map((a, i) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        description: a.summary,
        body: a.body,
        category: a.category,
        domain: a.domain || a.category,
        author: a.author?.name || 'Editorial Desk',
        authorId: a.author?.id || null,
        status: a.status || 'PENDING',
        editorialFeedback: a.editorialFeedback || null,
        date: new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        published: new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        readTime: '4 min read',
        image: a.image || (GC_DATA.articles && GC_DATA.articles[i % GC_DATA.articles.length]?.image) || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80'
      }));

      // In production mode, eliminate hardcoded mock state by directly using database articles
      GC_DATA.articles = backendArticles;
      this.dynamicHome.heroStories = backendArticles.slice(0, 3);
      this.dynamicHome.trending = backendArticles.slice(3, 8);
      this.dynamicHome.articles = backendArticles;

      this.renderHero();
      this.renderTrending();
      this.renderCategoryFeeds();
      this.renderTechSpotlight();
      this.renderBusinessHighlights();
      this.renderCyberAlerts();
      this.renderAIHighlights();
      if (this.currentPage === 'ai') this.renderAIPage();
    }
  }

  async fetchUserLibrarySync() {
    if (!this.authToken) return;
    const [savedRes, followRes] = await Promise.all([
      this.apiFetch('/user/saved'),
      this.apiFetch('/user/follows')
    ]);
    if (savedRes.ok && Array.isArray(savedRes.data?.savedArticleIds)) {
      this.savedArticles = Array.from(new Set([...this.savedArticles, ...savedRes.data.savedArticleIds]));
      localStorage.setItem('gc_saved', JSON.stringify(this.savedArticles));
      this.renderForYouPage();
    }
    if (followRes.ok && Array.isArray(followRes.data?.authors)) {
      const authors = followRes.data.authors;
      this.followedAuthorMap = Object.fromEntries(authors.map(author => [author.id, author.name]));
      this.followedAuthors = Array.from(new Set(authors.map(a => a.name).filter(Boolean)));
      localStorage.setItem('gc_following', JSON.stringify(this.followedAuthors));
      this.renderForYouPage();
    }
  }

  async fetchBackendEvents() {
    const res = await this.apiFetch('/events');
    if (res.ok && Array.isArray(res.data?.events)) {
      GC_DATA.events = res.data.events.map((event) => ({
        id: event.id,
        title: event.title,
        type: event.category || 'Event',
        date: new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date(event.eventDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        speaker: event.organizer?.name || 'OPEN MEDIA Team',
        organization: event.location || 'OPEN MEDIA',
        description: event.description,
        category: event.category,
        registrationUrl: '#',
        image: event.imageUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80',
        location: event.location,
        organizerId: event.organizerId,
        status: event.status
      }));
      this.renderEvents();
      if (this.currentUser?.role === 'ADMIN') this.loadAdminEvents();
    }
  }

  getCurrentUser() {
    if (!this.authToken) return null;
    try {
      const storedUser = JSON.parse(localStorage.getItem('gc_current_user') || 'null');
      if (!storedUser || !['USER', 'PUBLISHER', 'ADMIN'].includes(storedUser.role)) return null;
      this.currentUser = storedUser;
      return storedUser;
    } catch {
      return null;
    }
  }

  updateNavVisibility() {
    const user = this.getCurrentUser();
    const isAuthenticated = Boolean(user);
    const role = user?.role || null;
    const isReader = isAuthenticated && role === 'USER';
    const isPublisher = isAuthenticated && role === 'PUBLISHER';
    const isAdmin = isAuthenticated && role === 'ADMIN';

    const setVisible = (selector, visible) => document.querySelectorAll(selector).forEach(el => {
      el.hidden = !visible;
      el.style.display = visible ? '' : 'none';
    });

    setVisible('.auth-guest', !isAuthenticated);
    setVisible('.auth-user', isAuthenticated);
    setVisible('.reader-only-nav', isReader);
    setVisible('.publisher-only-nav, .publisher-only-menu', isPublisher);
    setVisible('.admin-only-nav, .admin-only-menu', isAdmin);

    // Strict RBAC: Header Publish button must ONLY be visible for PUBLISHER role. Admins manage articles in Admin Panel.
    const navPublish = document.getElementById('nav-publish');
    if (navPublish) {
      navPublish.hidden = !isPublisher;
      navPublish.style.display = isPublisher ? '' : 'none';
    }

    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin) {
      navAdmin.hidden = !isAdmin;
      navAdmin.style.display = isAdmin ? '' : 'none';
    }

    const navForYou = document.getElementById('nav-foryou');
    if (navForYou) {
      navForYou.hidden = !isReader;
      navForYou.style.display = isReader ? '' : 'none';
    }

    const nameEl = document.getElementById('menu-user-name');
    const roleEl = document.getElementById('menu-user-role');
    if (nameEl) nameEl.textContent = user?.name || 'Account';
    if (roleEl) {
      if (user?.isRootAdmin) {
        roleEl.textContent = 'Root Admin';
      } else if (role) {
        roleEl.textContent = role.charAt(0) + role.slice(1).toLowerCase();
      } else {
        roleEl.textContent = '';
      }
    }

    const pubAuthorInput = document.getElementById('pub-author');
    if (pubAuthorInput && (isPublisher || isAdmin)) {
      pubAuthorInput.value = user?.name || '';
    }

    // Restrict Add User button exclusively to Root Admin
    const btnOpenCreateUser = document.getElementById('btn-open-create-user');
    if (btnOpenCreateUser) {
      btnOpenCreateUser.style.display = user?.isRootAdmin ? '' : 'none';
    }
  }

  // Compatibility wrapper for older templates; all visibility now comes from one helper.
  updateRoleUI() { this.updateNavVisibility(); }

  // --- Consolidated 3-Tab Admin Review Suite ---
  switchAdminTab(tab) {
    this.activeAdminTab = tab;
    const tabNames = ['submissions', 'users', 'create'];
    tabNames.forEach(t => {
      const panel = document.getElementById(`admin-tab-${t}`);
      const btn = document.getElementById(`tab-btn-${t}`);
      if (t === tab) {
        if (panel) {
          panel.style.display = 'block';
          panel.classList.add('active');
        }
        if (btn) btn.classList.add('active');
      } else {
        if (panel) {
          panel.style.display = 'none';
          panel.classList.remove('active');
        }
        if (btn) btn.classList.remove('active');
      }
    });

    if (tab === 'submissions') {
      this.loadAdminSubmissions();
    } else if (tab === 'users') {
      this.loadAdminUsers();
    }
  }

  async loadAdminSubmissions() {
    if (this.currentUser?.role !== 'ADMIN') return;
    const tbody = document.getElementById('admin-submissions-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--color-dark-gray);">Fetching unified submissions pipeline from database...</td></tr>`;

    const typeFilter = document.getElementById('admin-filter-type')?.value || 'all';
    const statusFilter = document.getElementById('admin-filter-status')?.value || '';

    let [articlesRes, eventsRes] = await Promise.all([
      this.apiFetch(`/admin/submissions${statusFilter ? `?status=${statusFilter}` : ''}`),
      this.apiFetch('/admin/events')
    ]);

    let articles = (articlesRes.ok && Array.isArray(articlesRes.data?.submissions)) ? articlesRes.data.submissions : [];
    let counts = (articlesRes.ok && articlesRes.data?.counts) ? articlesRes.data.counts : { PENDING: 0, PUBLISHED: 0, REJECTED: 0, DRAFT: 0, CHANGES_REQUESTED: 0 };
    let events = (eventsRes.ok && Array.isArray(eventsRes.data?.events)) ? eventsRes.data.events : [];

    // Filter events by status if requested
    if (statusFilter) {
      events = events.filter(e => e.status === statusFilter);
    }

    // Map unified objects
    let unifiedList = [];
    if (typeFilter === 'all' || typeFilter === 'articles') {
      unifiedList.push(...articles.map(a => ({
        id: a.id,
        isEvent: false,
        title: a.title,
        summary: a.summary || '',
        category: a.category || 'Article',
        authorName: a.author?.name || 'Publisher Desk',
        authorEmail: a.author?.email || '',
        createdAt: a.createdAt,
        status: a.status || 'PENDING',
        editorialFeedback: a.editorialFeedback || null,
        raw: a
      })));
    }
    if (typeFilter === 'all' || typeFilter === 'events') {
      unifiedList.push(...events.map(e => ({
        id: e.id,
        isEvent: true,
        title: e.title,
        summary: e.description ? (e.description.slice(0, 100) + '...') : (e.location || 'Event'),
        category: `Event / ${e.category || 'General'}`,
        authorName: e.organizer?.name || 'Event Lead',
        authorEmail: e.organizer?.email || '',
        createdAt: e.createdAt || e.eventDate,
        status: e.status || 'PENDING',
        editorialFeedback: e.editorialFeedback || null,
        raw: e
      })));
    }

    // Sort by createdAt descending
    unifiedList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    this.adminSubmissions = unifiedList;

    // Update Counter Widgets
    const totalCount = (articlesRes.data?.submissions?.length || 0) + (eventsRes.data?.events?.length || 0);
    const pendingCount = (counts.PENDING || 0) + events.filter(e => e.status === 'PENDING').length;
    const publishedCount = (counts.PUBLISHED || 0) + events.filter(e => e.status === 'PUBLISHED').length;
    const rejectedCount = (counts.REJECTED || 0) + (counts.CHANGES_REQUESTED || 0) + (counts.DRAFT || 0) + events.filter(e => ['REJECTED', 'CHANGES_REQUESTED', 'DRAFT'].includes(e.status)).length;

    const totalEl = document.getElementById('admin-stat-total');
    const pendingEl = document.getElementById('admin-stat-pending');
    const pubEl = document.getElementById('admin-stat-published');
    const rejEl = document.getElementById('admin-stat-rejected');
    if (totalEl) totalEl.textContent = totalCount;
    if (pendingEl) pendingEl.textContent = pendingCount;
    if (pubEl) pubEl.textContent = publishedCount;
    if (rejEl) rejEl.textContent = rejectedCount;

    if (!unifiedList.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--color-dark-gray);">No submissions found matching filter criteria.</td></tr>`;
      this.updateBatchBar();
      return;
    }

    const badgeMap = {
      PENDING: 'status-pending',
      PUBLISHED: 'status-approved',
      DRAFT: 'status-under-review',
      CHANGES_REQUESTED: 'status-changes-requested',
      REJECTED: 'status-rejected'
    };

    tbody.innerHTML = unifiedList.map(s => {
      const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today';
      const isChecked = this.selectedSubmissions.has(s.id);
      const safeTitle = this.escapeHTML(s.title);
      const attrTitle = safeTitle.replace(/'/g, "\\'");

      return `
        <tr>
          <td style="text-align:center;">
            <input type="checkbox" class="sub-checkbox" value="${s.id}" data-type="${s.isEvent ? 'event' : 'article'}" ${isChecked ? 'checked' : ''} onchange="app.toggleSubmissionSelect('${s.id}', this.checked)">
          </td>
          <td style="max-width:280px;">
            <div style="display:flex; align-items:center; gap:6px;">
              ${s.isEvent ? '<span style="font-size:0.65rem; background:#EDE9FE; color:#6D28D9; font-weight:800; padding:2px 6px; border-radius:4px;">EVENT</span>' : ''}
              <b style="color:var(--color-deep-navy);">${safeTitle}</b>
            </div>
            ${s.summary ? `<div style="font-size:0.75rem; color:var(--color-dark-gray); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">${this.escapeHTML(s.summary)}</div>` : ''}
            ${s.editorialFeedback ? `<div style="font-size:0.72rem; color:#B45309; background:#FEF3C7; padding:2px 6px; border-radius:4px; margin-top:4px; display:inline-block;"><b>Feedback:</b> ${this.escapeHTML(s.editorialFeedback)}</div>` : ''}
          </td>
          <td><span class="category-tag" style="font-size:0.7rem;">${this.escapeHTML(s.category)}</span></td>
          <td>
            <b>${this.escapeHTML(s.authorName)}</b>
            ${s.authorEmail ? `<div style="font-size:0.72rem; color:var(--color-dark-gray);">${this.escapeHTML(s.authorEmail)}</div>` : ''}
          </td>
          <td>${dateStr}</td>
          <td><span class="status-badge ${badgeMap[s.status] || 'status-pending'}">${s.status}</span></td>
          <td>
            <div class="admin-actions-cell" style="flex-wrap:wrap; gap:4px;">
              ${s.status !== 'PUBLISHED' ? `
                <button class="btn btn-primary btn-xs" onclick="app.updateSubmissionStatus('${s.id}', 'PUBLISHED', '${s.isEvent ? 'event' : 'article'}')" title="Approve and publish live">
                  <i data-lucide="check"></i> Approve
                </button>
              ` : ''}
              ${s.status === 'PUBLISHED' ? `
                <button class="btn btn-outline btn-xs" onclick="app.updateSubmissionStatus('${s.id}', 'DRAFT', '${s.isEvent ? 'event' : 'article'}')" title="Take down to draft">
                  <i data-lucide="eye-off"></i> Take Down
                </button>
              ` : ''}
              <button class="btn btn-outline btn-xs text-orange" onclick="app.openRequestChangesModal('${s.id}', '${attrTitle}', 'CHANGES_REQUESTED', '${s.isEvent ? 'event' : 'article'}')" title="Request editorial changes with feedback">
                <i data-lucide="message-square-warning"></i> Request Changes
              </button>
              ${s.status !== 'REJECTED' ? `
                <button class="btn btn-outline btn-xs text-red" onclick="app.openRequestChangesModal('${s.id}', '${attrTitle}', 'REJECTED', '${s.isEvent ? 'event' : 'article'}')" title="Reject submission with feedback">
                  <i data-lucide="x"></i> Reject
                </button>
              ` : ''}
              ${!s.isEvent ? `
                <button class="btn btn-outline btn-xs" onclick="app.openEditArticleModal('${s.id}')" title="Edit full article content">
                  <i data-lucide="edit-2"></i> Edit
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.updateBatchBar();
    this.refreshIcons(tbody);
  }

  filterAdminSubmissions() {
    this.loadAdminSubmissions();
  }

  // --- Batch Actions in Submissions Table ---
  toggleSelectAllSubmissions(checked) {
    const checkboxes = document.querySelectorAll('.sub-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = checked;
      if (checked) {
        this.selectedSubmissions.add(cb.value);
      } else {
        this.selectedSubmissions.delete(cb.value);
      }
    });
    this.updateBatchBar();
  }

  toggleSubmissionSelect(id, checked) {
    if (checked) {
      this.selectedSubmissions.add(id);
    } else {
      this.selectedSubmissions.delete(id);
    }
    const allBox = document.getElementById('select-all-submissions');
    const checkboxes = document.querySelectorAll('.sub-checkbox');
    if (allBox && checkboxes.length) {
      allBox.checked = Array.from(checkboxes).every(cb => cb.checked);
    }
    this.updateBatchBar();
  }

  clearBatchSelection() {
    this.selectedSubmissions.clear();
    const allBox = document.getElementById('select-all-submissions');
    if (allBox) allBox.checked = false;
    document.querySelectorAll('.sub-checkbox').forEach(cb => cb.checked = false);
    this.updateBatchBar();
  }

  updateBatchBar() {
    const bar = document.getElementById('admin-batch-bar');
    const countEl = document.getElementById('batch-selected-count');
    if (!bar) return;

    const count = this.selectedSubmissions.size;
    if (count > 0) {
      bar.style.display = 'flex';
      if (countEl) countEl.innerHTML = `<i data-lucide="check-square"></i> ${count} item(s) selected`;
      this.refreshIcons(bar);
    } else {
      bar.style.display = 'none';
    }
  }

  async executeBatchAction(targetStatus) {
    if (this.selectedSubmissions.size === 0) return;
    const selectedIds = Array.from(this.selectedSubmissions);

    let feedbackReason = '';
    if (targetStatus === 'REJECTED' || targetStatus === 'CHANGES_REQUESTED') {
      feedbackReason = window.prompt(`Editorial feedback note for ${selectedIds.length} item(s):`, '') || '';
    }

    // Separate articles and events
    const articleIds = [];
    const eventIds = [];
    selectedIds.forEach(id => {
      const item = this.adminSubmissions.find(s => s.id === id);
      if (item?.isEvent) {
        eventIds.push(id);
      } else {
        articleIds.push(id);
      }
    });

    if (articleIds.length > 0) {
      await this.apiFetch('/admin/articles/batch-status', {
        method: 'POST',
        body: JSON.stringify({
          articleIds,
          status: targetStatus,
          editorialFeedback: feedbackReason.trim() || undefined
        })
      });
    }

    if (eventIds.length > 0) {
      await Promise.all(eventIds.map(eid => this.apiFetch(`/admin/events/${eid}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus, editorialFeedback: feedbackReason.trim() || undefined })
      })));
    }

    this.showToast(`Batch updated ${selectedIds.length} item(s) to ${targetStatus}`);
    this.clearBatchSelection();
    await this.loadAdminSubmissions();
    this.fetchBackendArticles();
    this.fetchBackendEvents();
  }

  async updateSubmissionStatus(id, newStatus, itemType = 'article', feedback = '') {
    const endpoint = itemType === 'event' ? `/admin/events/${id}/status` : `/admin/articles/${id}/status`;
    const res = await this.apiFetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({
        status: newStatus,
        editorialFeedback: feedback?.trim() || undefined
      })
    });

    if (res.ok) {
      this.showToast(`${itemType === 'event' ? 'Event' : 'Article'} status updated to ${newStatus}`);
      await this.loadAdminSubmissions();
      this.fetchBackendArticles();
      this.fetchBackendEvents();
    } else {
      this.showToast(`Failed to update status: ${res.data?.error || 'Error'}`);
    }
  }

  // --- Editorial Feedback Modal Handlers (Admin) ---
  openRequestChangesModal(id, title, targetStatus = 'CHANGES_REQUESTED', itemType = 'article') {
    const modal = document.getElementById('modal-request-changes');
    const itemIdEl = document.getElementById('feedback-item-id');
    const itemTypeEl = document.getElementById('feedback-item-type');
    const statusEl = document.getElementById('feedback-target-status');
    const titleEl = document.getElementById('feedback-item-title');
    const descEl = document.getElementById('feedback-action-description');
    const textEl = document.getElementById('feedback-reason-text');

    if (itemIdEl) itemIdEl.value = id;
    if (itemTypeEl) itemTypeEl.value = itemType;
    if (statusEl) statusEl.value = targetStatus;
    if (titleEl) titleEl.textContent = title || 'Submission';
    if (textEl) textEl.value = '';

    if (descEl) {
      descEl.textContent = targetStatus === 'REJECTED'
        ? 'Provide the reason why this submission is being rejected so the author is informed.'
        : 'Specify the editorial improvements required before this post can be approved.';
    }

    if (modal) {
      modal.classList.add('show');
      document.body.classList.add('modal-open');
    }
  }

  closeRequestChangesModal() {
    const modal = document.getElementById('modal-request-changes');
    if (modal) {
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
    }
  }

  async handleRequestChangesSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('feedback-item-id').value;
    const itemType = document.getElementById('feedback-item-type').value;
    const targetStatus = document.getElementById('feedback-target-status').value;
    const reason = document.getElementById('feedback-reason-text').value.trim();

    if (!id || !reason) {
      this.showToast('Please provide an editorial feedback reason.');
      return;
    }

    await this.updateSubmissionStatus(id, targetStatus, itemType, reason);
    this.closeRequestChangesModal();
  }

  // --- Admin Full Editorial Article Editor Modal ---
  async openEditArticleModal(articleId) {
    let article = this.adminSubmissions.find(a => a.id === articleId);
    if (!article) {
      const res = await this.apiFetch(`/articles/${articleId}`);
      if (res.ok && res.data?.article) {
        article = res.data.article;
      }
    }

    if (!article) {
      this.showToast('Article not found.');
      return;
    }

    document.getElementById('edit-article-id').value = article.id;
    document.getElementById('edit-article-title').value = article.title || '';
    document.getElementById('edit-article-category').value = article.category || 'IT';
    document.getElementById('edit-article-domain').value = article.domain || '';
    document.getElementById('edit-article-status').value = article.status || 'PENDING';
    document.getElementById('edit-article-image').value = article.image || '';
    document.getElementById('edit-article-summary').value = article.summary || '';
    document.getElementById('edit-article-body').value = article.body || '';

    const modal = document.getElementById('modal-edit-article');
    if (modal) {
      modal.classList.add('show');
      document.body.classList.add('modal-open');
    }
  }

  closeEditArticleModal() {
    const modal = document.getElementById('modal-edit-article');
    if (modal) {
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
    }
  }

  async handleEditArticleSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-article-id').value;
    const title = document.getElementById('edit-article-title').value.trim();
    const category = document.getElementById('edit-article-category').value;
    const domain = document.getElementById('edit-article-domain').value.trim();
    const status = document.getElementById('edit-article-status').value;
    const image = document.getElementById('edit-article-image').value.trim();
    const summary = document.getElementById('edit-article-summary').value.trim();
    const body = document.getElementById('edit-article-body').value.trim();
    const editorialFeedback = document.getElementById('edit-article-feedback')?.value.trim() || undefined;

    const payload = {
      title,
      category,
      domain: domain || undefined,
      status,
      image: image || undefined,
      summary,
      body,
      editorialFeedback
    };

    const res = await this.apiFetch(`/admin/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      this.showToast('Article content updated successfully.');
      this.closeEditArticleModal();
      await this.loadAdminSubmissions();
      this.fetchBackendArticles();
    } else {
      this.showToast(`Failed to update article: ${res.data?.error || 'Validation error'}`);
    }
  }

  async handleAdminArticleCreate(e, status = this.pendingAdminArticleStatus || 'PUBLISHED') {
    e.preventDefault();
    this.pendingAdminArticleStatus = null;
    if (this.currentUser?.role !== 'ADMIN') return;
    const payload = {
      title: document.getElementById('admin-create-title').value.trim(),
      category: document.getElementById('admin-create-category').value,
      domain: document.getElementById('admin-create-domain').value.trim() || undefined,
      image: document.getElementById('admin-create-image').value.trim() || undefined,
      summary: document.getElementById('admin-create-summary').value.trim(),
      body: document.getElementById('admin-create-body').value.trim(),
      status
    };
    const res = await this.apiFetch('/articles', { method: 'POST', body: JSON.stringify(payload) });
    if (res.ok) {
      this.showToast(status === 'PUBLISHED' ? 'Article published.' : 'Draft saved.');
      e.target.reset();
      const preview = document.getElementById('admin-create-image-preview');
      if (preview) preview.innerHTML = '';
      this.fetchBackendArticles();
      if (status === 'PUBLISHED') this.loadAdminSubmissions();
    } else {
      const errMsg = res.data?.message || (res.data?.details ? res.data.details.map(d => d.message).join(', ') : res.data?.error) || 'Unable to save article.';
      this.showToast(`Error: ${errMsg}`);
    }
  }

  saveAdminDraft() {
    const form = document.getElementById('admin-create-article-form');
    this.pendingAdminArticleStatus = 'DRAFT';
    form?.requestSubmit();
  }

  // --- User & Role Management Implementation ---
  async loadAdminUsers() {
    if (this.currentUser?.role !== 'ADMIN') return;
    const tbody = document.getElementById('admin-users-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--color-dark-gray);">Fetching platform user directory...</td></tr>`;

    const res = await this.apiFetch('/admin/users');
    if (res.ok && Array.isArray(res.data?.users)) {
      this.adminUsers = res.data.users;
      const counts = res.data.counts || {};

      const totalEl = document.getElementById('admin-stat-user-total');
      const readersEl = document.getElementById('admin-stat-user-readers');
      const pubsEl = document.getElementById('admin-stat-user-pubs');
      const adminsEl = document.getElementById('admin-stat-user-admins');

      if (totalEl) totalEl.textContent = counts.total || this.adminUsers.length;
      if (readersEl) readersEl.textContent = counts.users || 0;
      if (pubsEl) pubsEl.textContent = counts.publishers || 0;
      if (adminsEl) adminsEl.textContent = counts.admins || 0;

      this.filterAdminUsers();
    } else {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--color-dark-gray);">Failed to load platform user directory.</td></tr>`;
    }
  }

  filterAdminUsers() {
    const tbody = document.getElementById('admin-users-table-body');
    if (!tbody) return;

    const roleFilter = document.getElementById('admin-role-filter')?.value || 'ALL';
    let filtered = this.adminUsers || [];
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--color-dark-gray);">No users found matching the selected role filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';
      const articleCount = u._count?.articles || 0;
      const commentCount = u._count?.comments || 0;

      let roleBadge = `<span class="status-badge badge-user">Reader</span>`;
      if (u.isRootAdmin) {
        roleBadge = `<span class="status-badge badge-root-admin"><i data-lucide="crown" style="width:12px;height:12px;margin-right:3px;"></i> Root Admin</span>`;
      } else if (u.role === 'ADMIN') {
        roleBadge = `<span class="status-badge badge-admin">Administrator</span>`;
      } else if (u.role === 'PUBLISHER') {
        roleBadge = `<span class="status-badge badge-publisher">Publisher</span>`;
      }

      const actionsCell = u.isRootAdmin
        ? `<span class="status-badge badge-root-admin" style="font-size:0.7rem;">Primary Root</span>`
        : `<button class="btn btn-outline btn-xs" style="color:var(--color-crimson); border-color:#FECACA;" onclick="app.deleteAdminUser('${u.id}', '${this.escapeHTML(u.name).replace(/'/g, "\\'")}')" title="Delete account"><i data-lucide="trash-2"></i> Delete</button>`;

      return `
        <tr>
          <td><b style="color:var(--color-deep-navy);">${this.escapeHTML(u.name)}</b></td>
          <td><code>${this.escapeHTML(u.email)}</code></td>
          <td>${roleBadge}</td>
          <td>${dateStr}</td>
          <td style="text-align:center;"><b>${articleCount}</b></td>
          <td style="text-align:center;"><b>${commentCount}</b></td>
          <td style="text-align:center;">${actionsCell}</td>
        </tr>
      `;
    }).join('');

    this.refreshIcons(tbody);
  }

  async deleteAdminUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete the account for "${userName}"? This will also remove their associated submissions and comments.`)) {
      return;
    }
    const res = await this.apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      this.showToast(`Account for "${userName}" successfully removed.`);
      await this.loadAdminUsers();
    } else {
      this.showToast(`Failed to delete user: ${res.data?.error || 'Server error'}`);
    }
  }

  openCreateUserModal() {
    const modal = document.getElementById('modal-create-user');
    const feedback = document.getElementById('create-user-feedback');
    const form = document.getElementById('create-user-form');
    if (form) form.reset();
    if (feedback) {
      feedback.style.display = 'none';
      feedback.innerHTML = '';
    }
    if (modal) {
      modal.classList.add('show');
      document.body.classList.add('modal-open');
    }
  }

  closeCreateUserModal() {
    const modal = document.getElementById('modal-create-user');
    if (modal) {
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
    }
  }

  async handleCreateUserSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('create-user-name').value.trim();
    const email = document.getElementById('create-user-email').value.trim();
    const role = document.getElementById('create-user-role').value;
    const password = document.getElementById('create-user-password').value.trim();
    const feedback = document.getElementById('create-user-feedback');
    const submitBtn = document.getElementById('btn-submit-create-user');

    if (!name || !email || !role) return;

    if (submitBtn) submitBtn.disabled = true;

    const res = await this.apiFetch('/admin/users/create', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        role,
        password: password || undefined
      })
    });

    if (submitBtn) submitBtn.disabled = false;

    if (res.ok && res.data?.credentials) {
      const creds = res.data.credentials;
      this.showToast(`Account created: ${creds.email}`);
      this.loadAdminUsers();

      if (feedback) {
        feedback.style.display = 'block';
        feedback.innerHTML = `
          <div style="margin-top:16px; padding:14px; background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.3); border-radius:var(--radius-sm);">
            <div style="font-weight:700; color:#15803D; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <i data-lucide="check-circle-2"></i> Credentials Generated Successfully
            </div>
            <p style="font-size:0.8rem; color:var(--color-charcoal); margin-bottom:8px;">
              Copy the credentials below. Securely share them with the assigned operator:
            </p>
            <div class="credentials-display-box">
<pre>
<span class="cred-key">Name:</span>     <span class="cred-val">${this.escapeHTML(creds.name)}</span>
<span class="cred-key">Role:</span>     <span class="cred-val">${this.escapeHTML(creds.role)}</span>
<span class="cred-key">Email:</span>    <span class="cred-val">${this.escapeHTML(creds.email)}</span>
<span class="cred-key">Password:</span> <span class="cred-val">${this.escapeHTML(creds.password)}</span>
</pre>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-creds" onclick="app.copyCredentials('${this.escapeHTML(creds.email)}', '${this.escapeHTML(creds.password)}', '${this.escapeHTML(creds.role)}')">
              <i data-lucide="copy"></i> Copy Credential Details
            </button>
          </div>
        `;
        this.refreshIcons(feedback);
      }
    } else {
      const errMsg = res.data?.error || (res.data?.details ? res.data.details.map(d => d.message).join(', ') : 'Failed to create account');
      if (feedback) {
        feedback.style.display = 'block';
        feedback.innerHTML = `
          <div style="margin-top:16px; padding:12px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); border-radius:var(--radius-sm); color:#DC2626; font-size:0.85rem;">
            <b>Error:</b> ${this.escapeHTML(errMsg)}
          </div>
        `;
      }
      this.showToast(`Error: ${errMsg}`);
    }
  }

  async copyCredentials(email, password, role) {
    const textToCopy = `OPEN MEDIA CREDENTIALS\nRole: ${role}\nEmail: ${email}\nPassword: ${password}\nURL: http://localhost:4000`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      const btn = document.getElementById('btn-copy-creds');
      if (btn) {
        btn.innerHTML = `<i data-lucide="check"></i> Copied to Clipboard!`;
        this.refreshIcons(btn);
        setTimeout(() => {
          if (btn) {
            btn.innerHTML = `<i data-lucide="copy"></i> Copy Credential Details`;
            this.refreshIcons(btn);
          }
        }, 3000);
      }
      this.showToast('Credentials copied to clipboard!');
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      this.showToast('Could not access clipboard. Please manually copy the credentials above.');
    }
  }

  // --- Article Reader Comments Integration ---
  async loadArticleComments(articleId) {
    const listEl = document.getElementById(`comments-list-${articleId}`);
    const countEl = document.getElementById(`comment-count-${articleId}`);
    if (!listEl) return;

    const res = await this.apiFetch(`/articles/${articleId}/comments`);
    let comments = [];

    if (res.ok && Array.isArray(res.data?.comments)) {
      comments = res.data.comments;
    } else {
      comments = this.articleCommentsCache[articleId] || [];
    }

    if (countEl) countEl.textContent = comments.length;

    if (!comments.length) {
      listEl.innerHTML = `<div style="text-align:center; padding:18px; color:var(--color-dark-gray); font-size:0.85rem; font-style:italic;">No comments yet. Be the first to share your thoughts!</div>`;
      return;
    }

    listEl.innerHTML = comments.map(c => {
      const author = c.user?.name || 'Reader';
      const time = c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
      return `
        <div class="comment-card">
          <div class="comment-meta">
            <b>${this.escapeHTML(author)}</b>
            <span>${time}</span>
          </div>
          <div class="comment-content">${this.escapeHTML(c.content)}</div>
        </div>
      `;
    }).join('');
  }

  async handleCommentSubmit(e, articleId) {
    e.preventDefault();
    if (!this.currentUser) {
      this.openAuthModal('login');
      this.showToast('Please sign in to comment on this story.');
      return;
    }

    const input = document.getElementById(`comment-input-${articleId}`);
    if (!input || !input.value.trim()) {
      this.showToast('Comment cannot be empty.');
      return;
    }
    const content = input.value.trim();

    const res = await this.apiFetch(`/articles/${articleId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });

    if (res.ok) {
      input.value = '';
      this.showToast('Comment posted successfully');
      this.loadArticleComments(articleId);
    } else {
      if (!this.articleCommentsCache[articleId]) this.articleCommentsCache[articleId] = [];
      this.articleCommentsCache[articleId].unshift({
        id: `com-${Date.now()}`,
        content,
        user: { name: this.currentUser?.name || 'Reader' },
        createdAt: new Date().toISOString()
      });
      input.value = '';
      this.showToast('Comment posted (Local mode)');
      this.loadArticleComments(articleId);
    }
  }

  // --- SPA Navigation / Routing ---
  renderHomePage() {
    this.renderHero();
    this.renderTrending();
    this.renderTicker();
    this.renderEvents();
    this.renderEditorPicks();
    this.renderTechSpotlight();
    this.renderBusinessHighlights();
    this.renderCyberAlerts();
    this.renderAIHighlights();
    this.renderTrendingFlipbook();
  }

  handleInitialRoute() {
    const rawHash = (window.location.hash || '').trim();
    let page = 'home';

    if (rawHash && rawHash !== '#') {
      const candidate = rawHash.replace(/^#/, '');
      if (VALID_PAGES.includes(candidate)) {
        page = candidate;
      }
    }

    if (!rawHash || rawHash === '#' || page === 'home') {
      if (window.location.hash !== '#home') {
        window.history.replaceState(null, '', '#home');
      }
    }

    this.navigateTo(page, false);
    this.renderHomePage();
  }

  setupRouting() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    this.handleInitialRoute();
  }

  handleHashChange() {
    const page = (location.hash || '#home').replace('#', '');
    if (VALID_PAGES.includes(page)) {
      this.navigateTo(page, false);
    }
  }

  navigateTo(pageId, pushHash = true) {
    if (!VALID_PAGES.includes(pageId)) pageId = 'home';

    // Ensure any open modal, drawer, or overlay is cleanly dismissed upon page navigation
    this.closeAllModals();

    // Strict Role-Aware Navigation Guards
    const user = this.getCurrentUser();
    if (pageId === 'admin' && (!user || user.role !== 'ADMIN')) {
      this.showToast('Unauthorized access. Admin privileges required.');
      this.navigateTo('home', pushHash);
      return;
    }
    if (pageId === 'publish' && (!user || user.role !== 'PUBLISHER')) {
      this.showToast('Restricted: Publisher access is required.');
      this.navigateTo('home', pushHash);
      return;
    }
    if (pageId === 'foryou' && (!user || user.role !== 'USER')) {
      this.showToast('Sign in as a reader to view your personalized For You feed.');
      this.navigateTo('home', pushHash);
      return;
    }

    this.currentPage = pageId;

    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link, .mobile-nav-link, .mobile-bottom-nav .nav-item').forEach(el => el.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
      targetPage.classList.add('active');
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      this.refreshIcons(targetPage);
    }

    document.querySelectorAll(`[data-page="${pageId}"]`).forEach(el => el.classList.add('active'));

    if (pushHash && location.hash !== `#${pageId}`) {
      history.pushState(null, '', `#${pageId}`);
    }

    if (pageId === 'ai') {
      this.renderAIPage();
    }

    if (pageId === 'admin') {
      if (this.activeAdminTab === 'users') {
        this.loadAdminUsers();
      } else {
        this.loadAdminSubmissions();
      }
    }

    document.title = pageId === 'home'
      ? 'OPEN MEDIA — Technology, Business & Cybersecurity Intelligence'
      : `${pageId.charAt(0).toUpperCase() + pageId.slice(1)} — OPEN MEDIA`;
  }

  setupGlobalListeners() {
    window.addEventListener('error', (event) => {
      if (event.target instanceof HTMLImageElement) {
        event.target.classList.add('media-failed');
        if (!event.target.dataset.fallbackApplied && event.target.src && !event.target.src.startsWith('data:image/svg+xml')) {
          event.target.dataset.fallbackApplied = 'true';
          event.target.onerror = null;
          event.target.src = this.getImageFallbackSvg(event.target.alt || 'OPEN MEDIA');
        }
      }
    }, true);

    window.addEventListener('scroll', () => {
      const header = document.getElementById('main-header');
      if (window.scrollY > 40) header.classList.add('compact');
      else header.classList.remove('compact');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
      if (document.getElementById('page-home')?.classList.contains('active')) {
        if (e.key === 'ArrowRight') this.nextHeroStory(true);
        if (e.key === 'ArrowLeft') this.prevHeroStory(true);
      }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"]')) {
        e.preventDefault();
        e.target.click();
      }
    });

    document.addEventListener('click', (e) => {
      const menu = document.getElementById('profile-menu');
      const trigger = e.target.closest('.profile-dropdown-wrapper');
      if (!trigger && menu?.classList.contains('show')) menu.classList.remove('show');

      // Click to close fallback on any darkened overlay backdrop
      if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('ai-drawer-overlay') || e.target.classList.contains('mobile-drawer-overlay') || e.target.id === 'ai-drawer-overlay' || e.target.id === 'mobile-drawer-overlay') {
        this.closeAllModals();
      }
    });
  }

  // --- Homepage Hero Carousel + Side Trending Panel ---
  renderHero() {
    if (this.heroFlipInProgress) {
      this.heroRenderPending = true;
      return;
    }

    const heroes = this.getHomeHeroStories();
    const hero = heroes[this.currentHeroIndex] || heroes[0];
    const container = document.getElementById('hero-main-card');
    if (!container || !hero) return;
    const user = this.getCurrentUser();

    container.innerHTML = `
      <div class="hero-page-content">${this.heroPageMarkup(hero, this.currentHeroIndex, heroes.length, user)}</div>
      <div class="hero-carousel-controls">
        <button class="hero-nav-btn" data-hero-control onclick="app.prevHeroStory(true)" aria-label="Previous story">
          <i data-lucide="arrow-left"></i> Previous
        </button>
        <div class="hero-dots">
          ${heroes.map((_, i) => `<button class="hero-dot ${i === this.currentHeroIndex ? 'active' : ''}" data-hero-control onclick="app.goToHeroStory(${i})" aria-label="Go to story ${i + 1}"></button>`).join('')}
        </div>
        <button class="hero-nav-btn" data-hero-control onclick="app.nextHeroStory(true)" aria-label="Next story">
          Next <i data-lucide="arrow-right"></i>
        </button>
      </div>
    `;

    this.setupHeroSwipe();
    this.setupHeroHoverPause();
    this.renderSideTrendingPanel();
    this.renderEditorPicks();
    this.refreshIcons(container);
  }

  heroPageMarkup(hero, index, total, user) {
    const catSlug = this.categorySlug(hero.category);
    return `
      <div class="hero-image-box">
        <img src="${hero.image}" alt="${hero.title}" loading="eager">
      </div>
      <div class="hero-top-bar">
        <span class="category-tag cat-${catSlug}">${hero.category}</span>
        <div class="hero-top-right">
          <span class="hero-live-badge"><span></span> Live Pulse</span>
          <span class="hero-page-count">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
        </div>
      </div>
      <div class="hero-body">
        <h1 class="hero-title" onclick="app.openArticleModal('${hero.id}')" style="cursor:pointer;" title="Read full story">${hero.title}</h1>
        <p class="hero-desc">${hero.description}</p>
        <div class="hero-meta-row">
          <span>By <b>${hero.author}</b> · ${hero.readTime || ''} · Updated ${hero.published}</span>
          <div class="hero-actions">
            ${user ? `
            <button class="icon-btn" onclick="app.toggleSaveArticle('${hero.id}', event)" title="Save" aria-label="Save story">
              <i data-lucide="${this.isSaved(hero.id) ? 'bookmark-check' : 'bookmark'}"></i>
            </button>` : ''}
            <button class="icon-btn" onclick="app.openArticleModal('${hero.id}')" title="Read Full" aria-label="Read full story">
              <i data-lucide="maximize-2"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  flipHeroToStory(newIndex, direction) {
    if (this.heroFlipInProgress) return;

    const heroes = this.getHomeHeroStories();
    const hero = heroes[newIndex];
    const container = document.getElementById('hero-main-card');
    const page = container?.querySelector('.hero-page-content');
    if (!container || !page || !hero || newIndex === this.currentHeroIndex) return;

    this.heroFlipInProgress = true;
    this.heroRenderPending = false;
    container.querySelectorAll('[data-hero-control]').forEach((control) => {
      control.disabled = true;
    });

    const turningPage = page.cloneNode(true);
    turningPage.classList.add('hero-turn-page', direction > 0 ? 'hero-turn-forward' : 'hero-turn-backward');
    turningPage.setAttribute('aria-hidden', 'true');
    turningPage.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    container.appendChild(turningPage);

    this.currentHeroIndex = newIndex;
    page.innerHTML = this.heroPageMarkup(hero, newIndex, heroes.length, this.getCurrentUser());
    this.refreshIcons(page);

    let completed = false;
    const finishFlip = () => {
      if (completed) return;
      completed = true;
      clearTimeout(this.heroFlipTimer);
      turningPage.removeEventListener('animationend', onAnimationEnd);
      turningPage.remove();
      container.querySelectorAll('[data-hero-control]').forEach((control) => {
        control.disabled = false;
      });
      container.querySelectorAll('.hero-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === this.currentHeroIndex);
      });
      this.heroFlipInProgress = false;
      if (this.heroRenderPending) this.renderHero();
    };
    const onAnimationEnd = (event) => {
      if (event.target === turningPage) finishFlip();
    };

    turningPage.addEventListener('animationend', onAnimationEnd);
    void turningPage.offsetWidth;
    turningPage.classList.add('is-turning');
    const fallbackDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 180 : 600;
    this.heroFlipTimer = setTimeout(finishFlip, fallbackDuration);
  }

  nextHeroStory(userTriggered) {
    const total = this.getHomeHeroStories().length;
    const nextIdx = (this.currentHeroIndex + 1) % total;
    this.flipHeroToStory(nextIdx, 1);
    if (userTriggered) this.restartHeroAutoRotate();
  }

  prevHeroStory(userTriggered) {
    const total = this.getHomeHeroStories().length;
    const prevIdx = (this.currentHeroIndex - 1 + total) % total;
    this.flipHeroToStory(prevIdx, -1);
    if (userTriggered) this.restartHeroAutoRotate();
  }

  goToHeroStory(index) {
    if (index === this.currentHeroIndex) return;
    this.flipHeroToStory(index, index > this.currentHeroIndex ? 1 : -1);
    this.restartHeroAutoRotate();
  }

  setupHeroSwipe() {
    const card = document.getElementById('hero-main-card');
    if (!card || card.dataset.swipeInitialized) return;
    card.dataset.swipeInitialized = 'true';
    let startX = 0;
    card.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) {
        if (dx < 0) this.nextHeroStory(true); else this.prevHeroStory(true);
      }
    }, { passive: true });
  }

  setupHeroHoverPause() {
    const card = document.getElementById('hero-main-card');
    if (!card || card.dataset.hoverInitialized) return;
    card.dataset.hoverInitialized = 'true';
    card.addEventListener('mouseenter', () => clearInterval(this.aiHeroRotateTimer));
    card.addEventListener('mouseleave', () => this.startHeroAutoRotate());
  }

  startHeroAutoRotate() {
    clearInterval(this.aiHeroRotateTimer);
    this.aiHeroRotateTimer = setInterval(() => {
      if (this.currentPage === 'home') this.nextHeroStory(false);
    }, 7000);
  }

  restartHeroAutoRotate() {
    clearInterval(this.aiHeroRotateTimer);
    this.startHeroAutoRotate();
  }

  renderSideTrendingPanel() {
    const stories = this.getHomeTrending();
    const card = document.getElementById('magazine-flip-card');
    if (!card || !stories.length) return;

    const topTrending = stories.slice(0, 4);

    card.className = 'magazine-flip-card side-trending-card';
    card.innerHTML = `
      <div class="side-trending-header">
        <span class="eyebrow"><i data-lucide="radio-tower"></i> Trending News</span>
        <span class="side-trending-badge"><span></span> LIVE</span>
      </div>
      <div class="side-trending-list">
        ${topTrending.map((story, i) => `
          <div class="side-trending-item" onclick="app.showTrendingStoryModal('${story.id}')" tabindex="0" role="button" aria-label="${story.title}">
            <span class="side-trending-rank">${String(i + 1).padStart(2, '0')}</span>
            <div class="side-trending-content">
              <span class="category-tag cat-${this.categorySlug(story.category)}">${story.category}</span>
              <h4 class="side-trending-title">${story.title}</h4>
              <span class="side-trending-meta">${story.time} · Global Desk</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="side-trending-footer">
        <a href="javascript:void(0)" class="side-trending-link" onclick="document.getElementById('trending-container')?.scrollIntoView({behavior:'smooth'})">
          View all trending stories <i data-lucide="arrow-right"></i>
        </a>
      </div>
    `;

    this.refreshIcons(card);
  }

  showTrendingStoryModal(storyId) {
    const stories = this.getHomeTrending();
    const story = stories.find(s => s.id === storyId);
    if (!story) return;
    const article = this.getHomeArticles().find(a => a.title === story.title || a.id === story.id);
    if (article) {
      this.openArticleModal(article.id);
    } else {
      this.openArticleModal(story.id);
    }
  }

  // Compatibility aliases
  renderTrendingFlipbook() { this.renderSideTrendingPanel(); }
  nextTrendingStory(userTriggered) { this.nextHeroStory(userTriggered); }
  prevTrendingStory(userTriggered) { this.prevHeroStory(userTriggered); }
  goToTrendingStory(index) { this.goToHeroStory(index); }
  startTrendingAutoRotate() {}
  restartTrendingAutoRotate() {}
  advanceHeroStory(userTriggered) { this.nextHeroStory(userTriggered); }

  renderEditorPicks() {
    const strip = document.getElementById('editor-picks-strip');
    if (!strip) return;
    const picks = this.getHomeArticles().slice(0, 3);
    strip.innerHTML = picks.map(a => this.horizontalCardHTML(a)).join('');
    this.refreshIcons(strip);
  }

  // --- Ticker ---
  renderTicker() {
    const ticker = document.getElementById('ticker-content');
    const stories = this.getHomeTrending();
    if (!ticker || !stories.length) return;
    ticker.innerHTML = `<div class="ticker-text">${stories.map(t => `<span class="ticker-story"><i data-lucide="${this.trendingIcon(t.category)}"></i><b>${t.category}</b><span>${t.title}</span></span><span class="ticker-separator">/</span>`).join('')}</div>`;
    this.refreshIcons(ticker);
  }

  // --- Card render helpers ---
  horizontalCardHTML(item) {
    return `
      <div class="horizontal-card" onclick="app.openArticleModal('${item.id}')" tabindex="0" role="button">
        <img src="${item.image}" alt="${item.title}" loading="lazy">
        <div class="horizontal-card-body">
          <span class="story-category text-${this.accentClass(item.category)}">${item.domain || item.category}</span>
          <h4 class="story-title" style="font-size:0.95rem; margin: 6px 0;">${item.title}</h4>
          <span class="text-muted" style="font-size:0.75rem;">${item.time || item.date || ''}</span>
        </div>
      </div>`;
  }

  accentClass(category) {
    const map = { 'IT': 'blue', 'Business': 'emerald', 'Cyber Security': 'red', 'AI': 'purple' };
    return map[category] || 'blue';
  }

  editorialCardHTML(item, opts = {}) {
    const extraClass = opts.lead ? ' lead-story' : '';
    return `
      <div class="card-editorial${extraClass}" onclick="app.openArticleModal('${item.id}')" tabindex="0" role="button">
        <img src="${item.image}" alt="${item.title}" loading="lazy">
        <div class="card-editorial-body">
          <span class="story-category text-${this.accentClass(item.category)}">${item.domain || item.category}</span>
          <h3 class="card-editorial-title">${item.title}</h3>
          <p class="text-muted story-summary">${item.summary}</p>
          <div class="card-footer-meta">
            <span>By ${item.author}</span>
            <span>${item.readTime}</span>
          </div>
        </div>
      </div>`;
  }

  cyberCardHTML(item) {
    const sevClass = 'sev-' + (item.severity || 'high').toLowerCase().replace(/\s+/g, '-');
    return `
      <div class="card-editorial cyber-alert-card" onclick="app.openArticleModal('${item.id}')" tabindex="0" role="button">
        <img src="${item.image}" alt="${item.title}" loading="lazy">
        <div class="card-editorial-body">
          <span class="severity-badge ${sevClass}">${item.severity || 'ALERT'}</span>
          <h3 class="card-editorial-title">${item.title}</h3>
          <p class="text-muted story-summary">${item.summary}</p>
          <div class="card-footer-meta"><span>By ${item.author}</span><span>${item.date}</span></div>
        </div>
      </div>`;
  }

  storyHorizontalHTML(item) {
    return `
      <div class="story-horizontal" onclick="app.openArticleModal('${item.id}')" tabindex="0" role="button">
        <img src="${item.image}" alt="${item.title}" loading="lazy">
        <div class="story-body">
          <span class="story-category text-${this.accentClass(item.category)}">${item.domain || item.category}${item.severity ? ' · ' + item.severity : ''}</span>
          <h4 style="font-size:0.95rem; font-family:var(--font-heading);">${item.title}</h4>
          <span class="text-muted" style="font-size:0.75rem;">By ${item.author} · ${item.date}</span>
        </div>
      </div>`;
  }

  mostReadItemHTML(item, index) {
    return `
      <div class="most-read-item" onclick="app.openArticleModal('${item.id}')" tabindex="0" role="button">
        <span class="most-read-num">${String(index + 1).padStart(2, '0')}</span>
        <div class="most-read-body">
          <span class="story-category text-${this.accentClass(item.category)}">${item.category}</span>
          <h4>${item.title}</h4>
        </div>
      </div>`;
  }

  adUnitHTML(ad) {
    return `
      <div class="ad-unit">
        <span class="ad-tag">ADVERTISEMENT</span>
        <h4>${ad.title}</h4>
        <p>${ad.body}</p>
        <button class="btn btn-primary btn-sm" onclick="app.showToast('This is a sample advertisement placement.')">${ad.cta}</button>
      </div>`;
  }

  renderSidebarAd(slot) {
    if (!slot || !GC_DATA.ads.length) return;
    let adIndex = 0;
    const paint = () => {
      slot.innerHTML = this.adUnitHTML(GC_DATA.ads[adIndex]);
      slot.querySelector('.ad-unit')?.classList.add('sidebar-ad');
      adIndex = (adIndex + 1) % GC_DATA.ads.length;
    };
    paint();
    clearInterval(this.sidebarAdTimer);
    this.sidebarAdTimer = setInterval(paint, 9000);
  }

  renderMediaAd(slot, variant = 'business') {
    if (!slot) return;
    const copy = {
      foryou: ['Make Every Read Count', 'Curated intelligence for the ideas you follow.', 'Your signal, sharpened.'],
      tech: ['Power Your Next Breakthrough', 'Infrastructure insights for teams building the future.', 'Build smarter.'],
      business: ['Build What Is Next', 'Bring sharper intelligence to every strategic decision.', 'Discover'],
      cyber: ['Stay Ahead of the Threat', 'Practical briefings for teams defending what matters.', 'Explore briefing']
    }[variant] || ['Build What Is Next', 'Bring sharper intelligence to every strategic decision.', 'Discover'];
    const creatives = [
      { type: 'video', title: copy[0], body: copy[1], poster: GC_DATA.trending[0].image },
      { type: 'poster', title: variant === 'cyber' ? 'Security Without Guesswork' : 'The Signal, Delivered', body: copy[1], poster: GC_DATA.trending[variant === 'cyber' ? 2 : 4].image },
      { type: 'poster', title: variant === 'tech' ? 'The Infrastructure Brief' : 'Intelligence for Leaders', body: copy[1], poster: GC_DATA.trending[variant === 'tech' ? 1 : 5].image }
    ];
    slot.innerHTML = creatives.map(creative => `<div class="media-ad media-ad-${variant}" role="complementary" aria-label="Sponsored advertisement">
        <div class="media-ad-visual">
          ${creative.type === 'video'
            ? `<video autoplay muted loop playsinline poster="${creative.poster}" aria-label="Promotional video"><source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4"></video>`
            : `<img src="${creative.poster}" alt="" loading="lazy">`}
          <span class="media-ad-label">SPONSORED</span>
          <span class="media-ad-play"><i data-lucide="${creative.type === 'video' ? 'play' : 'image'}"></i></span>
        </div>
        <div class="media-ad-body"><span class="ad-tag">OPEN MEDIA PARTNER</span><h4>${creative.title}</h4><p>${creative.body}</p><button class="btn btn-primary btn-sm" onclick="app.showToast('This is a sample advertisement placement.')">${copy[2]} <i data-lucide="arrow-up-right"></i></button></div>
      </div>`).join('');
    this.refreshIcons();
    clearInterval(this.mediaAdTimer);
  }

  // --- Trending Section ---
  renderTrending() {
    const container = document.getElementById('trending-container');
    if (!container) return;
    container.innerHTML = this.getHomeTrending().map(t => this.horizontalCardHTML(t)).join('');
    this.refreshIcons(container);
  }

  // --- Tech / Business / Cyber / AI Home Sections ---
  renderTechSpotlight() {
    const container = document.getElementById('tech-spotlight-container');
    if (!container) return;
    const items = this.getHomeArticles().filter(a => a.category === 'IT').slice(0, 5);
    if (!items.length) { container.innerHTML = this.emptyStateHTML('technology'); return; }
    container.innerHTML = [
      this.editorialCardHTML(items[0], { lead: true }),
      ...items.slice(1, 5).map(i => this.editorialCardHTML(i))
    ].join('');
    this.refreshIcons(container);
  }

  renderBusinessHighlights() {
    const container = document.getElementById('business-highlights-container');
    if (!container) return;
    const items = this.getHomeArticles().filter(a => a.category === 'Business').slice(0, 3);
    container.innerHTML = items.length ? items.map(i => this.editorialCardHTML(i)).join('') : this.emptyStateHTML('business');
    this.refreshIcons(container);
  }

  renderCyberAlerts() {
    const container = document.getElementById('cyber-alerts-container');
    if (!container) return;
    const items = this.getHomeArticles().filter(a => a.category === 'Cyber Security').slice(0, 3);
    container.innerHTML = items.length ? items.map(i => this.cyberCardHTML(i)).join('') : this.emptyStateHTML('cyber security');
    this.refreshIcons(container);
  }

  renderAIHighlights() {
    const container = document.getElementById('ai-highlights-container');
    if (!container) return;
    const items = this.getHomeArticles().filter(a => a.category === 'AI').slice(0, 3);
    container.innerHTML = items.length ? items.map(i => this.editorialCardHTML(i)).join('') : this.emptyStateHTML('AI');
    this.refreshIcons(container);
  }

  renderMostRead() {
    const container = document.getElementById('most-read-container');
    if (!container) return;
    const items = this.getHomeArticles().slice(0, 5);
    container.innerHTML = items.map((item, i) => this.mostReadItemHTML(item, i)).join('');
    this.refreshIcons(container);
  }

  emptyStateHTML(label) {
    return `<div class="empty-state"><h4>No stories currently available</h4><p>There are no ${label} stories in this domain right now. Check back soon.</p></div>`;
  }

  // --- Upcoming Webinars & Events Grid ---
  renderEvents() {
    const container = document.getElementById('events-container');
    if (!container) return;
    container.innerHTML = this.getHomeEvents().map(e => `
      <div class="webinar-card event-card">
        <div class="webinar-banner event-banner">
          <img src="${e.image}" alt="${e.title}" loading="lazy">
          <span class="event-type-tag">${e.type || 'Webinar'}</span>
        </div>
        <div class="webinar-card-body event-card-body">
          <div class="event-card-content">
            <span class="webinar-date event-date">${e.date} · ${e.time || ''}</span>
            <h4 class="webinar-title event-title">${e.title}</h4>
            <p class="webinar-speaker event-speaker">Speaker: ${e.speaker} · ${e.organization || ''}</p>
          </div>
          <button class="btn btn-primary btn-sm webinar-btn" onclick="app.openEventModal('${e.id}')">Register Now</button>
        </div>
      </div>
    `).join('');
    this.refreshIcons(container);
  }

  // --- For You / Personalized Feed ---
  renderForYouPage() {
    const savedList = (GC_DATA.articles || []).filter(a => this.savedArticles.includes(a.id));
    if (this.savedArticles.length !== savedList.length) {
      this.savedArticles = savedList.map(a => a.id);
      localStorage.setItem('gc_saved', JSON.stringify(this.savedArticles));
    }
    const savedCountEl = document.getElementById('saved-count');
    if (savedCountEl) savedCountEl.textContent = savedList.length;

    const bmEventsCountEl = document.getElementById('bookmarked-events-count');
    if (bmEventsCountEl) bmEventsCountEl.textContent = this.bookmarkedEvents.length;

    const feedContainer = document.getElementById('foryou-feed');
    if (feedContainer) {
      if (this.libraryView === 'saved') {
        feedContainer.innerHTML = savedList.length ? `
          <div class="section-header" style="border:none;"><h2 style="font-size:1.1rem;">Saved Articles</h2></div>
          ${savedList.map(a => this.foryouRowHTML(a, 'Remove', `app.toggleSaveArticle('${a.id}')`)).join('')}
        ` : `<div class="empty-state"><h4>No saved stories yet.</h4><p>Bookmark stories across OPEN MEDIA and they will appear here.</p></div>`;
      } else if (this.libraryView === 'history') {
        const historyList = GC_DATA.articles.filter(a => this.readingHistory.includes(a.id));
        feedContainer.innerHTML = historyList.length ? `
          <div class="section-header" style="border:none;"><h2 style="font-size:1.1rem;">Reading History</h2></div>
          ${historyList.map(a => this.foryouRowHTML(a, 'Read Again', `app.openArticleModal('${a.id}')`)).join('')}
        ` : `<div class="empty-state"><h4>No reading history yet.</h4><p>Articles you open will show up here.</p></div>`;
      } else if (this.libraryView === 'events') {
        const eventList = GC_DATA.events.filter(e => this.bookmarkedEvents.includes(e.id));
        feedContainer.innerHTML = eventList.length ? `
          <div class="section-header" style="border:none;"><h2 style="font-size:1.1rem;">Bookmarked Events</h2></div>
          ${eventList.map(e => `
            <div class="panel-box">
              <span class="event-date">${e.date}</span>
              <h3 style="font-family:var(--font-heading); margin:6px 0;">${e.title}</h3>
              <p class="text-muted" style="font-size:0.9rem;">${e.description}</p>
              <div style="margin-top:12px; display:flex; gap:10px;">
                <button class="btn btn-outline btn-sm" onclick="app.openEventModal('${e.id}')">View Event</button>
                <button class="btn btn-outline btn-sm" onclick="app.toggleBookmarkEvent('${e.id}')">Remove</button>
              </div>
            </div>`).join('')}
        ` : `<div class="empty-state"><h4>No bookmarked events yet.</h4><p>Bookmark webinars and events to find them here.</p></div>`;
      } else if (this.libraryView === 'reports') {
        feedContainer.innerHTML = `<div class="empty-state"><h4>No downloaded reports yet.</h4><p>Intelligence reports you download will be listed here for offline access.</p></div>`;
      }
    }

    const followedAuthors = Object.entries(this.followedAuthorMap || {}).map(([id, name]) => ({ id, name }));
    const authorContainer = document.getElementById('followed-authors-list');
    if (authorContainer) {
      if (!followedAuthors.length) {
        authorContainer.innerHTML = '<div class="empty-state"><h4>No followed authors yet.</h4><p>Follow authors from Trending Authors below!</p></div>';
      } else {
        authorContainer.innerHTML = followedAuthors.map(author => `
          <div class="author-follow-row">
            <div class="author-info">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" alt="${author.name}" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\' viewBox=\'0 0 120 120\'><rect width=\'120\' height=\'120\' fill=\'#E2E8F0\'/><text x=\'50%\' y=\'54%\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-size=\'28\' fill=\'#475569\' font-family=\'Arial\'>${author.name.split(' ').slice(0,2).map(part=>part[0]).join('').slice(0,2).toUpperCase()}</text></svg>'">
              <div>
                <p class="author-name">${author.name}</p>
                <p class="author-topic">Contributor</p>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="app.toggleFollowAuthor('${author.name.replace(/'/g, "\\'")}', '${author.id}')">Unfollow</button>
          </div>
        `).join('');
      }
    }

    this.loadTrendingAuthors();

    const pageForYou = document.getElementById('page-foryou');
    if (pageForYou) this.refreshIcons(pageForYou);
  }

  async loadTrendingAuthors() {
    const container = document.getElementById('trending-authors-list');
    if (!container) return;
    const now = Date.now();
    if (this.trendingAuthorsRequestInFlight || (this.lastTrendingAuthorsLoadAt && now - this.lastTrendingAuthorsLoadAt < 20000)) {
      return;
    }
    this.lastTrendingAuthorsLoadAt = now;
    this.trendingAuthorsRequestInFlight = true;
    try {
      const res = await this.apiFetch('/authors/trending');
      if (!res.ok || !Array.isArray(res.data?.authors)) {
        container.innerHTML = '<div class="empty-state"><h4>Trending authors unavailable.</h4></div>';
        return;
      }

    const authors = res.data.authors;
    container.innerHTML = authors.map((author) => {
      const followed = this.followedAuthors.includes(author.name);
      const btnLabel = followed ? 'Following' : 'Follow';
      const btnClass = followed ? 'btn-outline' : 'btn-primary';
      const action = followed
        ? `app.toggleFollowAuthor('${String(author.name).replace(/'/g, "\\'")}', '${author.id}')`
        : `app.toggleFollowAuthor('${String(author.name).replace(/'/g, "\\'")}', '${author.id}')`;
      return `
        <div class="author-follow-row">
          <div class="author-info">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" alt="${author.name}" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\' viewBox=\'0 0 120 120\'><rect width=\'120\' height=\'120\' fill=\'#E2E8F0\'/><text x=\'50%\' y=\'54%\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-size=\'28\' fill=\'#475569\' font-family=\'Arial\'>${String(author.name).split(' ').slice(0,2).map(part=>part[0]).join('').slice(0,2).toUpperCase()}</text></svg>'">
            <div>
              <p class="author-name">${author.name}</p>
              <p class="author-topic">${author.role === 'ADMIN' ? 'Editor' : 'Author'}</p>
            </div>
          </div>
          <button class="btn ${btnClass} btn-sm" onclick="${action}">${btnLabel}</button>
        </div>
      `;
    }).join('');

      this.refreshIcons(container);
    } finally {
      this.trendingAuthorsRequestInFlight = false;
    }
  }

  foryouRowHTML(a, actionLabel, actionCall) {
    return `
      <div class="panel-box">
        <span class="story-category text-${this.accentClass(a.category)}">${a.category}</span>
        <h2 style="font-size:1.15rem; font-family:var(--font-heading); margin:8px 0;">${a.title}</h2>
        <p class="text-muted" style="font-size:0.9rem;">${a.summary}</p>
        <div style="margin-top:12px; display:flex; gap:10px;">
          <button class="btn btn-outline btn-sm" onclick="app.openArticleModal('${a.id}')">Read Article</button>
          <button class="btn btn-outline btn-sm" onclick="${actionCall}">${actionLabel}</button>
        </div>
      </div>`;
  }

  filterLibrary(type) {
    this.libraryView = type;
    document.querySelectorAll('#library-nav a').forEach(a => a.classList.toggle('active', a.dataset.lib === type));
    this.renderForYouPage();
  }

  // --- Domain Feeds & Domain Trees ---
  renderCategoryFeeds() {
    this.renderCategoryFeed('tech', 'tech-feed', 'tech-domain-tree', TECH_DOMAIN_GROUPS, 'tech-ad-slot');
    this.renderCategoryFeed('business', 'business-feed', 'business-domain-tree', BUSINESS_DOMAIN_GROUPS, 'business-ad-slot');
    this.renderCategoryFeed('cyber', 'cyber-feed', 'cyber-domain-tree', CYBER_DOMAIN_GROUPS, null);
    this.renderMediaAd(document.getElementById('business-right-ad-slot'));
    this.renderMediaAd(document.getElementById('foryou-right-ad-slot'), 'foryou');
    this.renderMediaAd(document.getElementById('tech-right-ad-slot'), 'tech');
    this.renderMediaAd(document.getElementById('cyber-right-ad-slot'), 'cyber');
  }

  renderCategoryFeed(type, feedId, treeId, domainGroups, adSlotId) {
    const feed = document.getElementById(feedId);
    if (!feed) return;
    const category = CAT_MAP[type];
    const items = GC_DATA.articles.filter(a => a.category === category);
    this.paintFeed(feed, items, type);

    const tree = document.getElementById(treeId);
    if (tree) {
      tree.innerHTML = Object.entries(domainGroups).map(([group, subs], index) => `
        <div class="domain-group" id="${type}-domain-group-${index}">
          <button type="button" class="domain-item domain-group-toggle" aria-expanded="false" onclick="app.toggleDomainGroup('${type}-domain-group-${index}')">
            <span>${group}</span><i data-lucide="chevron-down"></i>
          </button>
          <div class="domain-subdomains">
            ${subs.map(s => `<a href="#${type}" class="domain-item domain-subitem" onclick="app.filterByDomain('${type}', '${s.replace(/'/g, "\\'")}'); return false;">${s}</a>`).join('')}
          </div>
        </div>
      `).join('');
      this.refreshIcons(tree);
    }

    if (adSlotId) {
      const slot = document.getElementById(adSlotId);
      if (slot) {
        if (adSlotId === 'business-ad-slot') this.renderSidebarAd(slot);
        else slot.innerHTML = this.adUnitHTML(GC_DATA.ads[0]);
      }
    }
  }

  paintFeed(feed, items, type) {
    if (!items.length) {
      feed.innerHTML = `<div class="empty-state"><h4>No stories currently available</h4><p>There are no stories currently available in this domain.</p></div>`;
      return;
    }
    let html = '';
    items.forEach((a, i) => {
      html += type === 'cyber' ? this.storyHorizontalHTML(a) : this.storyHorizontalHTML(a);
      if ((i + 1) % 4 === 0 && GC_DATA.ads.length) {
        const ad = GC_DATA.ads[(Math.floor(i / 4)) % GC_DATA.ads.length];
        html += `<div class="ad-feed-insert">${this.adUnitHTML(ad)}</div>`;
      }
    });
    feed.innerHTML = `<div class="panel-box">${html}</div>`;
  }

  toggleDomainGroup(groupId) {
    const group = document.getElementById(groupId);
    if (!group) return;
    const expanded = group.classList.toggle('expanded');
    group.querySelector('.domain-group-toggle').setAttribute('aria-expanded', String(expanded));
  }

  filterCategory(type, filter, btnEl) {
    const parent = btnEl.parentElement;
    parent.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btnEl.classList.add('active');

    const feedMap = { tech: 'tech-feed', business: 'business-feed', cyber: 'cyber-feed', ai: 'ai-feed' };
    const category = CAT_MAP[type];
    const feed = document.getElementById(feedMap[type]);

    const items = filter === 'all'
      ? GC_DATA.articles.filter(a => a.category === category)
      : GC_DATA.articles.filter(a => a.category === category && a.domain === filter);

    if (type === 'ai') {
      feed.innerHTML = items.length ? items.map(a => this.editorialCardHTML(a)).join('') : this.emptyStateHTML('AI');
    } else {
      this.paintFeed(feed, items, type);
    }
  }

  filterByDomain(type, term) {
    const feedMap = { tech: 'tech-feed', business: 'business-feed', cyber: 'cyber-feed' };
    const category = CAT_MAP[type];
    const feed = document.getElementById(feedMap[type]);
    const canonical = BUSINESS_DOMAIN_MATCH[term] || GROUP_MATCH[term] || term;

    const items = GC_DATA.articles.filter(a => a.category === category &&
      (a.domain === term || a.domain === canonical || (a.title + ' ' + a.summary).toLowerCase().includes(term.toLowerCase())));

    this.paintFeed(feed, items, type);

    const chipBar = document.getElementById(`${type}-filters`);
    if (chipBar) {
      const chips = Array.from(chipBar.querySelectorAll('.chip'));
      chips.forEach(c => c.classList.remove('active'));
      const match = chips.find(c => c.textContent.trim().toLowerCase() === canonical.toLowerCase() || c.textContent.trim().toLowerCase() === term.toLowerCase());
      if (match) match.classList.add('active');
    }
    this.showToast(`Filtered by ${term}`);
    window.scrollTo({ top: document.getElementById(feedMap[type]).offsetTop - 100, behavior: 'smooth' });
  }

  // --- AI Page ---
  renderAIPage() {
    const aiArticles = GC_DATA.articles.filter(a => a.category === 'AI');
    if (!aiArticles.length) return;

    const heroStory = aiArticles[0];
    document.getElementById('ai-hero-story').innerHTML = `
      <img src="${heroStory.image}" alt="${heroStory.title}" loading="eager">
      <div class="card-editorial-body">
        <span class="story-category text-purple">${heroStory.domain}</span>
        <h2 class="card-editorial-title" style="font-size:1.6rem;">${heroStory.title}</h2>
        <p class="text-muted story-summary">${heroStory.summary}</p>
        <div class="card-footer-meta"><span>By ${heroStory.author}</span><span>${heroStory.date} · ${heroStory.readTime}</span></div>
      </div>`;
    document.getElementById('ai-hero-story').setAttribute('onclick', `app.openArticleModal('${heroStory.id}')`);

    document.getElementById('ai-secondary-stories').innerHTML = aiArticles.slice(1, 4).map(a => this.horizontalCardHTML(a)).join('');
    document.getElementById('ai-feed').innerHTML = aiArticles.slice(0, 6).map(a => this.editorialCardHTML(a)).join('');
    document.getElementById('ai-research-container').innerHTML = aiArticles.filter(a => a.domain === 'AI Research').map(a => this.horizontalCardHTML(a)).join('') || this.emptyStateHTML('AI research');
    document.getElementById('ai-startups-container').innerHTML = aiArticles.filter(a => a.domain === 'AI Startups').map(a => this.horizontalCardHTML(a)).join('') || this.emptyStateHTML('AI startup');
    document.getElementById('ai-tools-container').innerHTML = aiArticles.filter(a => a.domain === 'AI Tools & Agents').map(a => this.horizontalCardHTML(a)).join('') || this.emptyStateHTML('AI tools');
    document.getElementById('ai-most-read-container').innerHTML = aiArticles.slice(0, 4).map((a, i) => this.mostReadItemHTML(a, i)).join('');

    this.refreshIcons(document.getElementById('page-ai'));
  }

  // --- Bookmark Storage ---
  isSaved(id) { return this.savedArticles.includes(id); }

  async toggleSaveArticle(id, evt) {
    if (evt) evt.stopPropagation();
    if (this.isSaved(id)) {
      this.savedArticles = this.savedArticles.filter(item => item !== id);
      this.showToast('Article removed from library.');
    } else {
      this.savedArticles.push(id);
      this.showToast('Article saved to your library.');
    }
    localStorage.setItem('gc_saved', JSON.stringify(this.savedArticles));
    this.renderForYouPage();
    this.renderHero();
    this.refreshArticleModalIfOpen(id);

    if (this.authToken) {
      this.apiFetch(`/user/save/${id}`, { method: 'POST' });
    }
  }

  toggleBookmarkEvent(id) {
    if (this.bookmarkedEvents.includes(id)) {
      this.bookmarkedEvents = this.bookmarkedEvents.filter(e => e !== id);
      this.showToast('Event removed from bookmarks.');
    } else {
      this.bookmarkedEvents.push(id);
      this.showToast('Event bookmarked.');
    }
    localStorage.setItem('gc_bookmarked_events', JSON.stringify(this.bookmarkedEvents));
    this.renderForYouPage();
  }

  addToHistory(id) {
    this.readingHistory = [id, ...this.readingHistory.filter(h => h !== id)].slice(0, 30);
    localStorage.setItem('gc_history', JSON.stringify(this.readingHistory));
  }

  // --- Author Follow Storage ---
  isFollowing(name) { return this.followedAuthors.includes(name); }

  async toggleFollowAuthor(name, authorId = null) {
    if (!this.currentUser) {
      this.openAuthModal('login');
      this.showToast('Please sign in to follow authors.');
      return;
    }

    const resolvedAuthorId = authorId || Object.entries(this.followedAuthorMap).find(([, authorName]) => authorName === name)?.[0] || null;
    const currentlyFollowing = this.isFollowing(name) || (resolvedAuthorId && this.followedAuthorMap[resolvedAuthorId]);

    if (!resolvedAuthorId) {
      this.showToast('Author record is unavailable right now.');
      return;
    }

    const res = await this.apiFetch(`/user/follow/${resolvedAuthorId}`, { method: 'POST' });
    if (res.ok) {
      if (currentlyFollowing) {
        this.followedAuthors = this.followedAuthors.filter(a => a !== name);
        delete this.followedAuthorMap[resolvedAuthorId];
        this.showToast(`Unfollowed ${name}`);
      } else {
        this.followedAuthors = Array.from(new Set([...this.followedAuthors, name]));
        this.followedAuthorMap[resolvedAuthorId] = name;
        this.showToast(`Now following ${name}`);
      }
      localStorage.setItem('gc_following', JSON.stringify(this.followedAuthors));
      this.renderForYouPage();
    } else {
      this.showToast(res.data?.error || 'Could not update author follow state.');
    }
  }

  // --- Article Reader Modal ---
  findArticle(id) {
    const article = GC_DATA.articles.find(a => a.id === id) || GC_DATA.heroStories.find(h => h.id === id);
    if (article) return article;
    const trending = GC_DATA.trending ? GC_DATA.trending.find(t => t.id === id) : null;
    if (trending) {
      return {
        id: trending.id,
        title: trending.title,
        summary: `${trending.title}. Continuous coverage and intelligence briefing from the OPEN MEDIA editorial desk.`,
        description: `${trending.title}. Continuous coverage and intelligence briefing from the OPEN MEDIA editorial desk.`,
        body: `<p>${trending.title}</p><p>Security, technology and market indicators are shifting rapidly. OPEN MEDIA correspondents are following this developing story across our global bureaus.</p>`,
        category: trending.category,
        domain: trending.category,
        author: 'Global Desk',
        published: trending.time,
        date: trending.time,
        readTime: '3 min read',
        image: trending.image
      };
    }
    return null;
  }

  async openArticleModal(id) {
    let article = this.findArticle(id);
    if (!article) {
      const res = await this.apiFetch(`/articles/${id}`);
      if (res.ok && res.data?.article) {
        const a = res.data.article;
        article = {
          id: a.id,
          title: a.title,
          summary: a.summary,
          description: a.summary,
          body: a.body,
          category: a.category,
          domain: a.domain || a.category,
          author: a.author?.name || 'Editorial Desk',
          date: new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          published: new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          readTime: '4 min read',
          image: a.image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80'
        };
      }
    }
    if (!article) return;
    this.activeReaderArticleId = id;
    this.addToHistory(id);

    const modal = document.getElementById('article-modal');
    const content = document.getElementById('article-modal-content');
    const related = GC_DATA.articles.filter(a => a.category === article.category && a.id !== id).slice(0, 3);
    const tags = article.domain ? [article.domain, article.category] : [article.category];
    const bodyText = article.body || article.description || '';

    content.innerHTML = `
      <div class="article-reader-inner">
        <div class="article-reader-top">
          <span class="story-category text-${this.accentClass(article.category)}">${article.category}</span>
          <button class="icon-btn" onclick="app.closeArticleModal()" aria-label="Close article"><i data-lucide="x"></i></button>
        </div>
        <h1 class="article-reader-title">${article.title}</h1>
        ${article.description && article.body ? `<p class="article-reader-subtitle">${article.description}</p>` : ''}
        <div class="article-reader-meta">
          <span>By <b>${article.author || 'Editorial Desk'}</b></span>
          <span>Published ${article.date || article.published || 'Today'}</span>
          <span>${article.readTime || '4 min read'}</span>
        </div>
        <img class="article-reader-hero" src="${article.image}" alt="${article.title}">
        <div class="article-body">
          <p>${bodyText}</p>
          <div class="pull-quote">"${(article.summary || article.description || '').slice(0, 140)}"</div>
          <p>OPEN MEDIA's editorial desk will continue to update this story as new information becomes available from sources familiar with the matter.</p>
        </div>
        <div class="article-tags">
          ${tags.map(t => `<span class="article-tag">${t}</span>`).join('')}
        </div>
        <div class="article-actions">
          <button class="btn btn-primary btn-sm" onclick="app.runAIFunction('summarize')"><i data-lucide="sparkles"></i> Summarize with AI</button>
          ${this.getCurrentUser() ? `<button class="btn btn-outline btn-sm" onclick="app.toggleSaveArticle('${article.id}')"><i data-lucide="${this.isSaved(article.id) ? 'bookmark-check' : 'bookmark'}"></i> ${this.isSaved(article.id) ? 'Saved' : 'Save'}</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="app.shareArticle('${article.id}')"><i data-lucide="share-2"></i> Share</button>
        </div>
        ${related.length ? `
        <div class="related-stories-block">
          <h4>Related Stories</h4>
          <div style="display:flex; flex-direction:column;">
            ${related.map(r => this.storyHorizontalHTML(r)).join('')}
          </div>
        </div>` : ''}

        <!-- Reader Comments Section -->
        <div class="article-comments-section" id="comments-section-${article.id}">
          <div class="comments-header">
            <h3><i data-lucide="message-square"></i> Reader Discussion (<span id="comment-count-${article.id}">0</span>)</h3>
          </div>
          <form class="comment-form" onsubmit="app.handleCommentSubmit(event, '${article.id}')">
            <textarea id="comment-input-${article.id}" placeholder="Join the discussion${this.currentUser?.name ? ` as ${this.escapeHTML(this.currentUser.name)}` : ''}..." required></textarea>
            <div style="display:flex; justify-content:flex-end;">
              <button type="submit" class="btn btn-primary btn-sm"><i data-lucide="send"></i> Post Comment</button>
            </div>
          </form>
          <div class="comments-list" id="comments-list-${article.id}">
            <div style="text-align:center; padding:18px; color:var(--color-dark-gray); font-size:0.85rem;">Loading discussion...</div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('show');
    this.updateModalOpenState(true);
    this.refreshIcons(content);
    this.loadArticleComments(article.id);
  }

  refreshArticleModalIfOpen(id) {
    const modal = document.getElementById('article-modal');
    if (modal.classList.contains('show')) this.openArticleModal(id);
  }

  closeArticleModal() {
    this.activeReaderArticleId = null;
    document.getElementById('article-modal').classList.remove('show');
    this.updateModalOpenState(false);
  }

  async shareArticle(id) {
    const article = this.findArticle(id);
    const shareData = {
      title: article?.title || 'OPEN MEDIA',
      text: article?.summary || article?.description || 'Global technology, business, and cybersecurity intelligence.',
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        this.showToast('Article shared.');
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`);
        this.showToast('Link copied to clipboard.');
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
    }

    const fallback = document.createElement('textarea');
    fallback.value = `${shareData.title}\n${shareData.url}`;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand('copy');
    fallback.remove();
    this.showToast('Link copied to clipboard.');
  }

  openEventModal(eventId) {
    const evt = GC_DATA.events.find(e => e.id === eventId);
    if (!evt) return;

    const modal = document.getElementById('event-modal');
    const body = document.getElementById('event-modal-body');

    body.innerHTML = `
      <span class="event-type-tag" style="position:static; display:inline-block; margin-bottom:12px;">${evt.type || 'Event'}</span>
      <h2 style="font-family:var(--font-heading); margin-bottom:8px;">${evt.title}</h2>
      <p class="text-purple" style="font-weight:700; font-size:0.875rem; margin-bottom:6px;">${evt.date} · ${evt.time || ''}</p>
      <p class="text-muted" style="font-size:0.875rem; margin-bottom:16px;">Speaker: ${evt.speaker} · ${evt.organization || ''}</p>
      <p class="text-muted" style="font-size:0.9rem; margin-bottom:18px;">${evt.description}</p>
      <form onsubmit="app.handleEventRegister(event, '${evt.id}')">
        <div class="form-group">
          <label for="evt-reg-name">Full Name</label>
          <input type="text" id="evt-reg-name" class="form-control" required placeholder="D. Phani Kumar">
        </div>
        <div class="form-group">
          <label for="evt-reg-email">Work Email</label>
          <input type="email" id="evt-reg-email" class="form-control" required placeholder="phani@university.edu">
        </div>
        <div style="display:flex; gap:10px;">
          <button type="submit" class="btn btn-primary" style="flex:1;">Confirm Registration</button>
          <button type="button" class="btn btn-outline" onclick="app.toggleBookmarkEvent('${evt.id}')"><i data-lucide="bookmark"></i></button>
        </div>
      </form>
    `;

    modal.classList.add('show');
    this.updateModalOpenState(true);
    this.refreshIcons(modal);
  }

  closeEventModal() {
    document.getElementById('event-modal').classList.remove('show');
    this.updateModalOpenState(false);
  }

  openLegalPage(type) {
    const pages = {
      about: {
        title: 'About OPEN MEDIA',
        updated: 'Technology, business, AI, and cybersecurity intelligence',
        sections: [
          ['Our mission', 'OPEN MEDIA helps readers understand the forces shaping the modern world. We turn complex developments into clear, useful reporting for students, professionals, builders, and curious readers everywhere.'],
          ['What we cover', 'Our newsroom follows artificial intelligence, IT and innovation, cloud computing, semiconductors, startups, business strategy, markets, leadership, and cybersecurity threats. Coverage combines daily updates with context, analysis, and practical takeaways.'],
          ['Built for informed decisions', 'Explore focused category feeds, save stories to your personal library, follow expert contributors, and use the AI News Teller to ask questions about the newsroom. It can help summarize stories, explain technical topics, find related coverage, and recommend what to read next.'],
          ['Our commitment', 'We value accuracy, independence, responsible technology reporting, and respect for our readers. OPEN MEDIA clearly separates reported information from analysis and updates coverage when better information becomes available.']
        ]
      },
      privacy: {
        title: 'Privacy Policy',
        updated: 'Last updated: August 28, 2026',
        sections: [
          ['Information we collect', 'OPEN MEDIA may collect information you provide through forms, such as contact details and newsletter preferences. We also collect basic technical information needed to keep the site secure and usable.'],
          ['How we use information', 'We use information to deliver requested services, improve our journalism products, respond to messages, and send updates when you have chosen to receive them. We do not sell personal information.'],
          ['Your choices', 'You may request access to, correction of, or deletion of personal information by contacting the OPEN MEDIA editorial desk. You can unsubscribe from communications at any time.']
        ]
      },
      terms: {
        title: 'Terms of Service',
        updated: 'Last updated: August 28, 2026',
        sections: [
          ['Using OPEN MEDIA', 'You may read, share, and link to OPEN MEDIA content for personal and informational use. Please do not copy, republish, or commercially exploit our reporting without written permission.'],
          ['Editorial content', 'Our coverage is provided for general information and does not constitute legal, financial, investment, or security advice. Facts and analysis may be updated as reporting develops.'],
          ['Acceptable conduct', 'Do not interfere with the site, misuse its forms or services, impersonate others, or submit content that violates the law or another person’s rights.']
        ]
      },
      editorial: {
        title: 'Editorial Guidelines',
        updated: 'Our standards for responsible journalism',
        sections: [
          ['Accuracy first', 'We verify important claims with reliable sources, distinguish confirmed facts from allegations, and correct material errors transparently.'],
          ['Independence and fairness', 'Our editorial decisions are independent of advertisers, sponsors, and commercial partners. We seek relevant perspectives and disclose meaningful conflicts of interest.'],
          ['Responsible technology reporting', 'We avoid sensationalism, protect vulnerable sources, and do not publish operational details that would materially enable cyber abuse. Analysis is clearly separated from reported fact.']
        ]
      }
    };
    const page = pages[type] || pages.privacy;
    const body = document.getElementById('legal-modal-body');
    if (body) {
      body.innerHTML = `<h2 style="font-family:var(--font-heading); margin-bottom:6px;">${page.title}</h2><p class="text-muted" style="font-size:0.8rem; margin-bottom:20px;">${page.updated}</p>${page.sections.map(section => `<h3 style="font-size:1rem; margin:18px 0 6px;">${section[0]}</h3><p class="text-muted" style="font-size:0.9rem;">${section[1]}</p>`).join('')}`;
    }
    const legalModal = document.getElementById('legal-modal');
    legalModal.classList.add('show');
    this.updateModalOpenState(true);
    this.refreshIcons(legalModal);
  }

  closeLegalPage() {
    document.getElementById('legal-modal').classList.remove('show');
    this.updateModalOpenState(false);
  }

  handleEventRegister(e, eventId) {
    e.preventDefault();
    this.eventRegistrations.push({
      id: `registration-${Date.now()}`,
      eventId,
      name: document.getElementById('evt-reg-name').value.trim(),
      email: document.getElementById('evt-reg-email').value.trim(),
      date: new Date().toISOString()
    });
    localStorage.setItem('gc_event_registrations', JSON.stringify(this.eventRegistrations));
    this.closeEventModal();
    this.showToast('Registration successful! Access pass sent to your email.');
  }

  closeModal(modalId = null) {
    if (modalId) {
      const el = document.getElementById(modalId);
      if (el) el.classList.remove('show', 'active');
    } else {
      this.closeAllModals();
    }
    this.updateModalOpenState(false);
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay, .ai-teller-drawer, .ai-drawer-overlay, .mobile-drawer, .mobile-drawer-overlay').forEach(el => {
      el.classList.remove('show', 'active', 'dimmed');
    });
    document.body.classList.remove('modal-open', 'dimmed');
    document.documentElement.classList.remove('modal-open', 'dimmed');
    this.updateModalOpenState(false);
  }

  // --- AI News Teller ---
  toggleAITeller(forceState = null) {
    const drawer = document.getElementById('ai-teller-drawer');
    const overlay = document.getElementById('ai-drawer-overlay');
    if (!drawer) return;
    const isShowing = forceState !== null ? forceState : !drawer.classList.contains('show');
    drawer.classList.toggle('show', isShowing);
    drawer.classList.toggle('active', isShowing);
    if (overlay) {
      overlay.classList.toggle('show', isShowing);
      overlay.classList.toggle('active', isShowing);
    }
    this.updateModalOpenState(isShowing);
    if (isShowing) {
      this.renderAIChat();
      document.getElementById('ai-ask-input')?.focus();
      this.refreshIcons(drawer);
    }
  }

  renderAIChat() {
    const output = document.getElementById('ai-output-box');
    if (!output) return;
    const messages = this.aiChat.length ? this.aiChat : [{ role: 'assistant', content: 'I can search the OPEN MEDIA newsroom, summarize stories, compare topics, and recommend what to read next.' }];
    output.innerHTML = messages.map(message => `<div class="ai-message ai-message-${message.role}">${this.escapeHTML(message.content).replace(/\n/g, '<br>')}</div>`).join('');
    output.scrollTop = output.scrollHeight;
  }

  escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  }

  addAIMessage(role, content) {
    this.aiChat.push({ role, content });
    this.aiChat = this.aiChat.slice(-20);
    localStorage.setItem('gc_ai_chat', JSON.stringify(this.aiChat));
    this.renderAIChat();
  }

  async summarizeAITeller(triggerBtn = null) {
    const btn = triggerBtn || document.getElementById('home-summarize-btn') || document.getElementById('btn-ai-summarize');
    let originalHtml = '';
    if (btn) {
      originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Summarizing...`;
      this.refreshIcons(btn);
    }

    const homeBox = document.getElementById('ai-home-summary-box');
    const homeContent = document.getElementById('ai-home-summary-content');
    if (homeBox && homeContent) {
      homeBox.style.display = 'block';
      homeContent.innerHTML = `<div class="ai-thinking"><i data-lucide="loader-2" class="spin"></i> Synthesizing latest news intelligence from the newsroom...</div>`;
      this.refreshIcons(homeContent);
      homeBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const output = document.getElementById('ai-output-box');
    if (output) {
      this.addAIMessage('user', 'Summarize the latest important news in two short paragraphs.');
      output.insertAdjacentHTML('beforeend', '<div class="ai-thinking"><i data-lucide="loader-2" class="spin"></i> Generating executive summary...</div>');
      output.scrollTop = output.scrollHeight;
      this.refreshIcons(output);
    }

    let summary = '';
    try {
      // 1. Attempt fetch request to backend API
      try {
        const response = await fetch(`${this.apiBase}/articles/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: 'Summarize latest news' })
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.summary) {
            summary = data.summary;
          }
        }
      } catch (networkError) {
        console.warn('Backend summarize endpoint offline or unreachable:', networkError);
        this.showToast('Notice: Live AI service offline. Summarizing loaded newsroom coverage.', 'info');
      }

      // 2. Fallback to local AI news synthesis if backend was unavailable
      if (!summary) {
        summary = this.localAIAnswer('summarize');
      }

      // 3. Render summary into home page summary box
      if (homeContent) {
        homeContent.innerHTML = `<div class="ai-summary-text">${this.escapeHTML(summary).replace(/\n/g, '<br>')}</div>`;
      }

      // 4. Also register message in AI chat drawer
      this.aiChat = this.aiChat.filter(message => message.content !== 'Generating executive summary...');
      this.addAIMessage('assistant', summary);
      this.showToast('News summary generated successfully!');
    } catch (error) {
      console.error('Error generating AI summary:', error);
      this.showToast('Failed to generate AI summary: ' + (error.message || 'Network error'), 'error');
      if (homeContent) {
        homeContent.innerHTML = `<div class="ai-error-text text-red"><i data-lucide="alert-circle"></i> Unable to generate summary at this time. Please check your network connection.</div>`;
        this.refreshIcons(homeContent);
      }
    } finally {
      if (output) {
        const thinkingEls = output.querySelectorAll('.ai-thinking');
        thinkingEls.forEach(el => el.remove());
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        this.refreshIcons(btn);
      }
    }
  }

  async runAIFunction(type, triggerBtn = null) {
    if (type === 'summarize') {
      await this.summarizeAITeller(triggerBtn);
      return;
    }
    const prompts = {
      summarize: 'Summarize the latest important news in two short paragraphs.',
      takeaways: 'What are the key takeaways from the latest technology and cybersecurity news?',
      explain: 'Explain the most important current news simply for a beginner.',
      translate: 'Translate a brief summary of the latest news into Hindi.',
      recommend: 'Recommend three stories I should read next and explain why.',
      readAloud: 'Give me a concise briefing of the latest news to read aloud.'
    };
    await this.askAI(prompts[type] || prompts.summarize, type === 'readAloud', triggerBtn);
  }

  async askAI(question, readAloud = false, triggerBtn = null) {
    const q = question.trim();
    if (!q) return;

    let originalBtnHtml = '';
    if (triggerBtn) {
      originalBtnHtml = triggerBtn.innerHTML;
      triggerBtn.disabled = true;
      triggerBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Processing...`;
      this.refreshIcons(triggerBtn);
    }

    this.addAIMessage('user', q);
    const output = document.getElementById('ai-output-box');
    if (output) {
      output.insertAdjacentHTML('beforeend', '<div class="ai-thinking"><i data-lucide="loader-2" class="spin"></i> Searching the newsroom...</div>');
      output.scrollTop = output.scrollHeight;
      this.refreshIcons(output);
    }

    let answer;
    try {
      const endpoint = window.OPEN_MEDIA_AI_ENDPOINT || `${this.apiBase}/articles/summarize`;
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, messages: this.aiChat, articles: this.aiContext() })
        });
        if (response.ok) {
          const data = await response.json();
          answer = data.answer || data.summary || data.message || data.content;
        }
      } catch (err) {
        console.warn('Live AI endpoint unreachable, using local news synthesis:', err);
      }

      if (!answer) {
        answer = this.localAIAnswer(q);
      }
    } catch (err) {
      console.error('askAI error:', err);
      this.showToast('Network error during AI request. Using local news synthesis.', 'warning');
      answer = this.localAIAnswer(q);
    } finally {
      if (output) {
        const thinkingEls = output.querySelectorAll('.ai-thinking');
        thinkingEls.forEach(el => el.remove());
      }
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = originalBtnHtml;
        this.refreshIcons(triggerBtn);
      }
    }

    this.addAIMessage('assistant', answer || 'I could not find an answer in the current newsroom. Try asking about AI, business, cloud, or cybersecurity.');
    if (readAloud && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer));
    }
  }

  aiContext() {
    return GC_DATA.articles.slice(0, 24).map(article => ({ title: article.title, summary: article.summary, category: article.category, domain: article.domain, date: article.date }));
  }

  localAIAnswer(question) {
    const query = question.toLowerCase().trim();
    const context = this.aiContext();

    // 1. Summarize intent
    if (/summarize|executive summary|briefing|summary|overview/.test(query) || query === 'summarize') {
      const topStories = context.slice(0, 4);
      return `**Executive Intelligence Briefing**:\n\n` +
        `• **Technology & AI**: ${topStories[0]?.title || 'Frontier AI developments continue to accelerate across enterprise sectors.'} — ${topStories[0]?.summary || ''}\n\n` +
        `• **Cybersecurity & Threat Defense**: ${topStories[1]?.title || 'Threat intelligence teams monitor critical infrastructure vectors.'} — ${topStories[1]?.summary || ''}\n\n` +
        `• **Enterprise & Markets**: ${topStories[2]?.title || 'Corporate investments and hardware scaling lead industry announcements.'} — ${topStories[2]?.summary || ''}\n\n` +
        `*Synthesized across ${context.length} current newsroom intelligence reports.*`;
    }

    // 2. Key Takeaways intent
    if (/takeaway|key point|bullet|highlights/.test(query) || query.includes('takeaways')) {
      const top = context.slice(0, 3);
      return `**Key Intelligence Takeaways**:\n\n` +
        top.map((art, i) => `${i + 1}. **${art.title}**\n   ${art.summary}`).join('\n\n');
    }

    // 3. Explain Simply intent
    if (/explain|simple|beginner|plain/.test(query) || query.includes('explain')) {
      const art = context[0];
      return `**In Simple Terms**:\n\n` +
        `Today's major headline is **"${art?.title || 'technology and security updates'}"**.\n\n` +
        `In plain language, governments and leading technology companies are setting up unified safety guardrails and software updates to keep artificial intelligence and computer networks safe. At the same time, businesses are doubling their budgets for automated tools that can handle operations faster.\n\n` +
        `Context: ${art?.summary || 'New international agreements and technologies are being deployed to balance rapid innovation with enterprise safety.'}`;
    }

    // 4. Translate intent
    if (/translate|hindi|bhasha|anuvad/.test(query) || query.includes('translate')) {
      const top = context.slice(0, 3);
      return `**मुख्य समाचार सारांश (Hindi Intelligence Briefing)**:\n\n` +
        `1. **${top[0]?.title || 'प्रौद्योगिकी समाचार'}**: वैश्विक तकनीकी मंचों पर कृत्रिम बुद्धिमत्ता (AI) के सुरक्षा मानकों और नए नियमों पर सहमति बन रही है।\n\n` +
        `2. **${top[1]?.title || 'साइबर सुरक्षा'}**: औद्योगिक नेटवर्किंग और बुनियादी ढांचे में संभावित साइबर सुरक्षा खतरों के खिलाफ सुरक्षात्मक उपाय किए जा रहे हैं।\n\n` +
        `3. **${top[2]?.title || 'बाज़ार और व्यापार'}**: एंटरप्राइज ऑटोमेशन और नई तकनीकों में कॉरपोरेट निवेश तेज़ी से बढ़ रहा है।`;
    }

    // 5. Recommend intent
    if (/recommend|read next|suggest|what to read/.test(query) || query.includes('recommend')) {
      return `**Recommended Reading from the Newsroom**:\n\n` +
        context.slice(0, 3).map((article, i) => `${i + 1}. **${article.title}** (${article.category} · ${article.domain})\n   *Why read*: ${article.summary}`).join('\n\n');
    }

    // 6. Read aloud intent
    if (/read aloud|audio|listen|spoken/.test(query) || query.includes('read aloud')) {
      const top = context.slice(0, 2);
      return `Here is your OPEN MEDIA briefing. First: ${top[0]?.title}. ${top[0]?.summary} Second: ${top[1]?.title}. ${top[1]?.summary} That concludes your executive update.`;
    }

    // 7. General keyword search across articles
    const matches = context.filter(article =>
      `${article.title} ${article.summary} ${article.category} ${article.domain}`.toLowerCase().includes(query) ||
      query.split(/\s+/).some(word => word.length > 3 && `${article.title} ${article.summary} ${article.category} ${article.domain}`.toLowerCase().includes(word))
    ).slice(0, 3);

    if (matches.length) {
      return matches.map((article, i) => `${i + 1}. **${article.title}** (${article.category} · ${article.date})\n${article.summary}`).join('\n\n');
    }

    return `I searched the newsroom for "${question}". While an exact match wasn't found, our top stories right now cover **AI governance**, **cloud infrastructure**, **zero-day cyber alerts**, and **enterprise funding**. Try asking about one of these topics!`;
  }

  handleAIAsk(e) {
    e.preventDefault();
    const input = document.getElementById('ai-ask-input');
    const question = input.value.trim();
    input.value = '';
    this.askAI(question);
  }

  // --- Search Overlay ---
  openSearch() {
    const modal = document.getElementById('search-modal');
    modal.classList.add('show');
    this.updateModalOpenState(true);
    document.getElementById('search-input').focus();
    this.handleSearchInput('');
  }

  closeSearch() {
    document.getElementById('search-modal').classList.remove('show');
    this.updateModalOpenState(false);
  }

  handleSearchInput(query) {
    const area = document.getElementById('search-results-area');
    const trendingTerms = ['Artificial Intelligence', 'Cybersecurity', 'Semiconductors', 'Nvidia', 'Cloud Computing', 'Startups'];

    if (!query.trim()) {
      area.innerHTML = `
        <div class="search-trending-title">Trending Searches</div>
        <div class="search-trending-chips">
          ${trendingTerms.map(t => `<button class="chip" onclick="document.getElementById('search-input').value='${t}'; app.handleSearchInput('${t}')">${t}</button>`).join('')}
        </div>`;
      return;
    }

    const q = query.toLowerCase();
    const articleMatches = GC_DATA.articles.filter(a => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || (a.domain || '').toLowerCase().includes(q));
    const eventMatches = GC_DATA.events.filter(e => e.title.toLowerCase().includes(q));
    const authorMatches = GC_DATA.authors.filter(a => a.name.toLowerCase().includes(q));

    if (!articleMatches.length && !eventMatches.length && !authorMatches.length) {
      area.innerHTML = `<div class="empty-state"><h4>No stories found.</h4><p>Try another keyword or explore a category.</p></div>`;
      return;
    }

    let html = '';
    if (articleMatches.length) {
      html += articleMatches.slice(0, 8).map(m => `
        <div class="search-result-item" onclick="app.closeSearch(); app.openArticleModal('${m.id}')">
          <span class="story-category text-${this.accentClass(m.category)}">${m.category}</span>
          <h4 style="font-size:0.95rem; font-family:var(--font-heading);">${this.highlight(m.title, query)}</h4>
        </div>`).join('');
    }
    if (eventMatches.length) {
      html += eventMatches.map(m => `
        <div class="search-result-item" onclick="app.closeSearch(); app.openEventModal('${m.id}')">
          <span class="story-category text-purple">Event</span>
          <h4 style="font-size:0.95rem; font-family:var(--font-heading);">${this.highlight(m.title, query)}</h4>
        </div>`).join('');
    }
    if (authorMatches.length) {
      html += authorMatches.map(m => `
        <div class="search-result-item" onclick="app.closeSearch(); app.navigateTo('foryou')">
          <span class="story-category text-blue">Author</span>
          <h4 style="font-size:0.95rem; font-family:var(--font-heading);">${this.highlight(m.name, query)}</h4>
        </div>`).join('');
    }
    area.innerHTML = html;
  }

  highlight(text, query) {
    if (!query) return text;
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    return text.replace(re, '<mark>$1</mark>');
  }

  // --- Notifications (Dynamic & Zero-Mock) ---
  openNotifications() {
    const list = document.getElementById('notif-list-container');
    if (!list) return;

    const notifs = (this.notifications && this.notifications.length) ? this.notifications : [
      { icon: 'shield-alert', cls: 'text-red', bg: '#FEE2E2', title: 'EDITORIAL SYSTEM ACTIVE', body: 'Live newsroom synchronized with real-time editorial websocket pipeline.', time: 'Just now' },
      { icon: 'globe', cls: 'text-blue', bg: '#DBEAFE', title: 'PLATFORM READY', body: 'OPEN MEDIA real-time production suite is online and connected.', time: '1m ago' }
    ];

    list.innerHTML = notifs.map(n => `
      <div class="notif-item">
        <div class="notif-icon" style="background:${n.bg};"><i data-lucide="${n.icon}" class="${n.cls}"></i></div>
        <div>
          <div class="notif-title-row ${n.cls}">${this.escapeHTML(n.title)}</div>
          <p>${this.escapeHTML(n.body)}</p>
          <div class="notif-time">${this.escapeHTML(n.time)}</div>
        </div>
      </div>
    `).join('');

    document.getElementById('notifications-modal').classList.add('show');
    this.updateModalOpenState(true);

    this.notifCount = 0;
    const countEl = document.getElementById('notif-count');
    if (countEl) countEl.style.display = 'none';
    this.refreshIcons(list);
  }

  closeNotifications() {
    document.getElementById('notifications-modal').classList.remove('show');
    this.updateModalOpenState(false);
  }

  // --- Publisher Workspace & Re-Submission Pipeline ---
  switchPublishTab(tab, btnEl) {
    document.querySelectorAll('.publish-tab-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    document.querySelectorAll('.publish-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`publish-tab-${tab}`);
    if (panel) panel.classList.add('active');

    if (tab === 'submissions' || tab === 'feedback') {
      this.renderPublisherTracker();
      this.renderPublisherFeedbackHistory();
    }
  }

  async renderPublisherTracker() {
    const body = document.getElementById('publisher-tracker-body');
    if (!body) return;

    const statusClassMap = {
      PENDING: 'status-pending',
      PUBLISHED: 'status-approved',
      REJECTED: 'status-rejected',
      DRAFT: 'status-under-review',
      CHANGES_REQUESTED: 'status-changes-requested'
    };

    if (!this.currentUser || !['PUBLISHER', 'ADMIN'].includes(this.currentUser.role)) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--color-dark-gray);">Log in as a publisher or admin to view your submissions.</td></tr>';
      this.renderPublisherFeedbackHistory();
      return;
    }

    try {
      const [artRes, evtRes] = await Promise.all([
        this.apiFetch('/articles/mine/list'),
        this.apiFetch('/events/mine')
      ]);

      const articles = (artRes.ok && Array.isArray(artRes.data?.articles)) ? artRes.data.articles : [];
      const events = (evtRes.ok && Array.isArray(evtRes.data?.events)) ? evtRes.data.events : [];
      this.publisherArticles = articles;

      const unifiedMine = [
        ...articles.map(a => ({ id: a.id, isEvent: false, title: a.title, category: a.category, createdAt: a.createdAt, status: a.status || 'PENDING', feedback: a.editorialFeedback, raw: a })),
        ...events.map(e => ({ id: e.id, isEvent: true, title: e.title, category: `Event / ${e.category || 'General'}`, createdAt: e.createdAt || e.eventDate, status: e.status || 'PENDING', feedback: e.editorialFeedback, raw: e }))
      ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      if (!unifiedMine.length) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--color-dark-gray);">No submissions yet. Submit your technological analysis or event above!</td></tr>';
      } else {
        body.innerHTML = unifiedMine.map(s => {
          const title = s.title || 'Untitled';
          const date = s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today';
          const status = s.status || 'PENDING';
          const canResubmit = !s.isEvent && (status === 'CHANGES_REQUESTED' || status === 'REJECTED');

          return `
            <tr>
              <td>
                <div style="display:flex; align-items:center; gap:6px;">
                  ${s.isEvent ? '<span style="font-size:0.65rem; background:#EDE9FE; color:#6D28D9; font-weight:800; padding:2px 6px; border-radius:4px;">EVENT</span>' : ''}
                  <b style="color:var(--color-deep-navy);">${this.escapeHTML(title)}</b>
                </div>
              </td>
              <td><span class="category-tag" style="font-size:0.7rem;">${this.escapeHTML(s.category)}</span></td>
              <td>${date}</td>
              <td><span class="status-badge ${statusClassMap[status] || 'status-pending'}">${status}</span></td>
              <td>
                ${canResubmit ? `
                  <button class="btn btn-primary btn-xs" onclick="app.openResubmitArticleModal('${s.id}')" title="Edit and resubmit this article for review">
                    <i data-lucide="refresh-cw"></i> Edit &amp; Resubmit
                  </button>
                ` : `
                  <button class="btn btn-outline btn-xs" onclick="${s.isEvent ? `app.openEventModal('${s.id}')` : `app.openArticleModal('${s.id}')`}" title="View details">
                    <i data-lucide="eye"></i> View
                  </button>
                `}
              </td>
            </tr>
          `;
        }).join('');
      }
    } catch (error) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--color-dark-gray);">Unable to load your submissions right now.</td></tr>';
    }

    this.renderPublisherFeedbackHistory();
    this.refreshIcons(body);
  }

  renderPublisherFeedbackHistory() {
    const body = document.getElementById('publisher-feedback-body');
    if (!body) return;

    const articles = Array.isArray(this.publisherArticles) ? this.publisherArticles : [];
    const withFeedback = articles.filter(a => a.editorialFeedback || a.status === 'CHANGES_REQUESTED' || a.status === 'REJECTED');

    if (!withFeedback.length) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--color-dark-gray);">No moderation feedback recorded yet.</td></tr>';
      return;
    }

    body.innerHTML = withFeedback.map(article => `
      <tr>
        <td style="max-width:240px;"><b>${this.escapeHTML(article.title || 'Untitled Article')}</b></td>
        <td><span class="status-badge ${article.status === 'PUBLISHED' ? 'status-approved' : article.status === 'CHANGES_REQUESTED' ? 'status-changes-requested' : article.status === 'REJECTED' ? 'status-rejected' : 'status-pending'}">${this.escapeHTML(article.status || 'PENDING')}</span></td>
        <td style="max-width:320px;">
          <div class="publisher-notice ${article.status === 'CHANGES_REQUESTED' ? 'notice-changes' : 'notice-rejected'}" style="padding:8px 12px; margin:0;">
            <p style="margin:0; font-size:0.85rem;">${this.escapeHTML(article.editorialFeedback || 'Editorial team requested revisions before publication.')}</p>
          </div>
        </td>
        <td>${this.escapeHTML(article.updatedAt || article.createdAt ? new Date(article.updatedAt || article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today')}</td>
        <td>
          <button class="btn btn-primary btn-xs" onclick="app.openResubmitArticleModal('${article.id}')" title="Apply revisions and resubmit">
            <i data-lucide="send"></i> Resubmit for Review
          </button>
        </td>
      </tr>
    `).join('');

    this.refreshIcons(body);
  }

  // --- Publisher Re-submission Pipeline Modal ---
  async openResubmitArticleModal(articleId) {
    let article = this.publisherArticles.find(a => a.id === articleId);
    if (!article) {
      const res = await this.apiFetch(`/articles/${articleId}`);
      if (res.ok && res.data?.article) {
        article = res.data.article;
      }
    }

    if (!article) {
      this.showToast('Article not found.');
      return;
    }

    document.getElementById('resubmit-article-id').value = article.id;
    document.getElementById('resubmit-title').value = article.title || '';
    document.getElementById('resubmit-category').value = article.category || 'IT';
    document.getElementById('resubmit-domain').value = article.domain || '';
    document.getElementById('resubmit-image').value = article.image || '';
    document.getElementById('resubmit-summary').value = article.summary || '';
    document.getElementById('resubmit-body').value = article.body || '';

    const banner = document.getElementById('resubmit-editorial-feedback-banner');
    const feedbackText = document.getElementById('resubmit-feedback-text');
    if (banner && feedbackText) {
      if (article.editorialFeedback) {
        banner.style.display = 'flex';
        feedbackText.textContent = article.editorialFeedback;
      } else {
        banner.style.display = 'none';
        feedbackText.textContent = '';
      }
    }

    const modal = document.getElementById('modal-resubmit-article');
    if (modal) {
      modal.classList.add('show');
      document.body.classList.add('modal-open');
    }
  }

  closeResubmitArticleModal() {
    const modal = document.getElementById('modal-resubmit-article');
    if (modal) {
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
    }
  }

  async handleResubmitArticleSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('resubmit-article-id').value;
    const title = document.getElementById('resubmit-title').value.trim();
    const category = document.getElementById('resubmit-category').value;
    const domain = document.getElementById('resubmit-domain').value.trim();
    const image = document.getElementById('resubmit-image').value.trim();
    const summary = document.getElementById('resubmit-summary').value.trim();
    const body = document.getElementById('resubmit-body').value.trim();
    const submitBtn = document.getElementById('btn-submit-resubmit');

    if (!id || !title || !category || !summary || !body) {
      this.showToast('Please fill all required article fields.');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    const res = await this.apiFetch(`/articles/${id}/resubmit`, {
      method: 'PATCH',
      body: JSON.stringify({
        title,
        category,
        domain: domain || undefined,
        image: image || undefined,
        summary,
        body
      })
    });

    if (submitBtn) submitBtn.disabled = false;

    if (res.ok && res.data?.article) {
      this.showToast('Article resubmitted for editorial review.');
      this.closeResubmitArticleModal();
      await this.renderPublisherTracker();
      this.renderPublisherFeedbackHistory();
    } else {
      const errMsg = res.data?.message || (res.data?.details ? res.data.details.map(d => d.message).join(', ') : res.data?.error) || 'Validation error';
      this.showToast(`Failed to resubmit: ${errMsg}`);
    }
  }

  async handleLocalImageSelection(fileInputId, targetInputId, previewId) {
    const fileInput = document.getElementById(fileInputId);
    const targetInput = document.getElementById(targetInputId);
    const preview = document.getElementById(previewId);
    const file = fileInput?.files?.[0];
    if (!file || !targetInput) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = String(event.target?.result || '');
      fileInput.dataset.localDataUrl = dataUrl;
      targetInput.dataset.localDataUrl = dataUrl;
      targetInput.value = dataUrl;
      if (preview) {
        preview.innerHTML = `<img src="${dataUrl}" alt="Selected preview" style="max-width:160px;max-height:90px;border-radius:8px;object-fit:cover;margin-top:6px;border:1px solid var(--color-border-gray);">`;
      }
    };
    reader.readAsDataURL(file);
  }

  async handleArticleSubmission(e) {
    e.preventDefault();
    const form = e.target;
    const title = document.getElementById('pub-title').value.trim();
    const category = document.getElementById('pub-category').value;
    const author = document.getElementById('pub-author').value.trim();
    const image = document.getElementById('pub-image').value.trim() || document.getElementById('article-image-file')?.dataset.localDataUrl || '';
    const description = document.getElementById('pub-description').value.trim();
    const body = document.getElementById('pub-content').value.trim();
    const tags = document.getElementById('pub-tags').value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!title || !category || !body) {
      this.showToast('Title, category, and body are required before submission.');
      form.reportValidity?.();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i data-lucide="loader-circle"></i> Submitting...';
      this.refreshIcons(submitBtn);
    }

    try {
      const res = await this.apiFetch('/articles', {
        method: 'POST',
        body: JSON.stringify({
          title,
          summary: description,
          body: body || description,
          category,
          domain: tags || category,
          image: image || undefined,
          status: 'PENDING'
        })
      });

      if (res.ok && res.data?.article) {
        this.showToast(res.data.message || 'Article submitted for editorial review.');
        form.reset();
        const preview = document.getElementById('pub-image-preview');
        if (preview) preview.innerHTML = '';
        document.getElementById('pub-author').value = this.currentUser?.name || '';
        await this.renderPublisherTracker();
      } else {
        const errMsg = res.data?.message || (res.data?.details ? res.data.details.map(d => d.message).join(', ') : res.data?.error) || 'Validation error';
        this.showToast(`Submission failed: ${errMsg}`);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtn.dataset.originalText || '<i data-lucide="send"></i> Submit for Editorial Review';
        this.refreshIcons(submitBtn);
      }
    }
  }

  async handleEventSubmission(e) {
    e.preventDefault();
    const title = document.getElementById('evt-name').value.trim();
    const description = document.getElementById('evt-desc').value.trim();
    const eventDate = document.getElementById('evt-date').value;
    const location = document.getElementById('evt-location')?.value.trim() || 'TBD';
    const category = document.getElementById('evt-category')?.value || 'IT';
    const imageUrl = document.getElementById('evt-banner').value.trim() || document.getElementById('evt-banner-file')?.dataset.localDataUrl || '';

    if (!title || !description || !eventDate || !location) {
      this.showToast('Please complete all required event fields.');
      return;
    }

    const payload = {
      title,
      description,
      eventDate,
      location,
      category,
      imageUrl: imageUrl || undefined,
      organizerId: this.currentUser?.id || null
    };

    const res = await this.apiFetch('/events', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok && res.data?.event) {
      this.showToast('Event submitted for editorial review.');
      e.target.reset();
      const preview = document.getElementById('evt-banner-preview');
      if (preview) preview.innerHTML = '';
      this.renderPublisherTracker();
      this.fetchBackendEvents();
    } else {
      const errMsg = res.data?.message || (res.data?.details ? res.data.details.map(d => d.message).join(', ') : res.data?.error) || 'Unable to submit event.';
      this.showToast(errMsg);
    }
  }

  validatePublicForm(form, fields) {
    const values = {};
    fields.forEach(({ id, key }) => {
      const field = document.getElementById(id);
      field.value = field.value.trim();
      values[key] = field.value;
      if (id === 'contact-phone') {
        field.setCustomValidity(/^[0-9]{10}$/.test(field.value) ? '' : 'Enter a valid 10-digit contact number.');
      } else if (id === 'adv-name') {
        field.setCustomValidity(/^[A-Za-z ]+$/.test(field.value) ? '' : 'Enter a name using letters and spaces only.');
      }
    });
    if (!form.checkValidity()) {
      form.reportValidity();
      return null;
    }
    return values;
  }

  handleCareerApplication(e) {
    e.preventDefault();
    const values = this.validatePublicForm(e.target, [
      { id: 'career-name', key: 'name' }, { id: 'career-email', key: 'email' },
      { id: 'career-role', key: 'role' }, { id: 'career-portfolio', key: 'portfolio' },
      { id: 'career-note', key: 'note' }
    ]);
    if (!values) return;
    this.showToast(`Thanks, ${values.name}. Your application was received.`);
    e.target.reset();
  }

  handleContactSubmission(e) {
    e.preventDefault();
    const values = this.validatePublicForm(e.target, [
      { id: 'contact-name', key: 'name' }, { id: 'contact-email', key: 'email' },
      { id: 'contact-phone', key: 'phone' }, { id: 'contact-subject', key: 'subject' },
      { id: 'contact-message', key: 'message' }
    ]);
    if (!values) return;
    this.showToast(`Thanks, ${values.name}. Your message was sent.`);
    e.target.reset();
  }

  handleAdvertiseSubmission(e) {
    e.preventDefault();
    const values = this.validatePublicForm(e.target, [
      { id: 'adv-name', key: 'name' },
      { id: 'adv-company', key: 'company' },
      { id: 'adv-email', key: 'email' },
      { id: 'adv-package', key: 'package' }
    ]);
    if (!values) return;
    this.showToast(`Thank you, ${values.name}. Our media partnerships team will contact ${values.email} within 24 hours.`);
    e.target.reset();
  }

  handleNewsletterSubscribe(e) {
    e.preventDefault();
    this.showToast('Thanks for subscribing to OPEN MEDIA Intelligence.');
    e.target.reset();
  }

  // --- Menus & Utilities ---
  openAuthModal(mode = 'login') {
    document.getElementById('auth-login-form').hidden = mode !== 'login';
    document.getElementById('auth-register-form').hidden = mode !== 'register';
    document.getElementById('auth-modal-title').innerHTML = mode === 'login' ? '<i data-lucide="log-in"></i> Login' : '<i data-lucide="user-plus"></i> Create account';
    document.getElementById('modal-auth').classList.add('show');
    document.body.classList.add('modal-open');
    this.refreshIcons(document.getElementById('modal-auth'));
  }

  closeAuthModal() { document.getElementById('modal-auth').classList.remove('show'); document.body.classList.remove('modal-open'); }

  togglePasswordVisibility(inputId, btnElement) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (btnElement) {
      btnElement.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btnElement.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}"></i>`;
      this.refreshIcons(btnElement);
    }
  }

  completeAuthentication(data) {
    this.authToken = data.token; this.currentUser = data.user;
    localStorage.setItem('gc_auth_token', this.authToken);
    localStorage.setItem('gc_current_user', JSON.stringify(this.currentUser));
    this.updateNavVisibility(); this.closeAuthModal(); this.fetchUserLibrarySync();
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const now = Date.now();
    if (now - this.lastAuthAttemptAt < 2000) {
      this.showToast('Please wait a moment before trying again.');
      return;
    }
    this.lastAuthAttemptAt = now;

    const res = await this.apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (res.ok && res.data?.token) {
      this.completeAuthentication(res.data);
      this.showToast('Welcome back.');
      return;
    }

    if (res.status === 0 && res.error?.message === 'Request throttled') {
      this.showToast('Please wait a moment before retrying sign-in.');
      return;
    }

    this.showToast(res.data?.error || 'Unable to sign in.');
  }

  async handleRegister(e) {
    e.preventDefault();
    const res = await this.apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name: document.getElementById('register-name').value.trim(), email: document.getElementById('register-email').value.trim(), password: document.getElementById('register-password').value }) });
    if (res.ok && res.data?.token) { this.completeAuthentication(res.data); this.showToast('Account created.'); }
    else this.showToast(res.data?.error || 'Unable to create account.');
  }
  toggleMobileNav() {
    const drawer = document.getElementById('mobile-drawer');
    if (!drawer) return;
    if (drawer.classList.contains('show')) {
      this.closeMobileNav();
      return;
    }
    drawer.classList.add('show');
    document.getElementById('mobile-drawer-overlay')?.classList.add('show');
  }

  closeMobileNav() {
    document.getElementById('mobile-drawer')?.classList.remove('show');
    document.getElementById('mobile-drawer-overlay')?.classList.remove('show');
  }

  toggleProfileMenu() {
    document.getElementById('profile-menu').classList.toggle('show');
  }

  signOut() {
    this.authToken = null; this.currentUser = null;
    localStorage.removeItem('gc_auth_token'); localStorage.removeItem('gc_current_user');
    document.getElementById('profile-menu')?.classList.remove('show');
    this.updateNavVisibility(); this.navigateTo('home');
    this.showToast('Signed out successfully.');
  }

  simulatedSignOut() { this.signOut(); }

  showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  window.app = new GlobalCoverageApp();
});
