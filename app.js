// ==========================================================================
// NovaHacks QuickChat - Figma Pages 1 & 2 Implementation
// Includes Onboarding with Skip, Generate QR, Course Threads (BUSM 1872),
// Frame 1 Action Bar (Add Users, Remove User, Delete Chat) & 24h TTL Sync.
// ==========================================================================

(function () {
  'use strict';

  // Local Storage Keys
  const PROFILE_STORAGE_KEY = 'novahacks_quickchat_user_profile';
  const ROOMS_STORAGE_KEY = 'novahacks_quickchat_rooms';
  const ONBOARDED_KEY = 'novahacks_quickchat_onboarded_flag';
  const GUEST_ID_KEY = 'novahacks_guest_identity';
  const BROADCAST_CHANNEL_NAME = 'novahacks_quickchat_broadcast';

  // Palette colors for participant avatar initials (Component 19:436)
  const INITIAL_COLORS = [
    'circle-color-navy',
    'circle-color-cyan',
    'circle-color-magenta',
    'circle-color-lime'
  ];

  // Broadcast Channel for live cross-tab/cross-window messaging
  let broadcastChannel = null;
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported in this environment.', e);
  }

  // Unique client identity for distinguishing sent messages (ChatWave format)
  const myClientId = localStorage.getItem('cw-client-id') || (() => {
    const id = (globalThis.crypto?.randomUUID?.()) || `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try { localStorage.setItem('cw-client-id', id); } catch (e) {}
    return id;
  })();

  // --------------------------------------------------------------------------
  // 1. Profile State & Onboarding (Figma 16:83)
  // --------------------------------------------------------------------------
  const DEFAULT_PROFILE = {
    avatar: 'assets/avatar.jpg',
    fullName: 'Maya Patel',
    pronouns: 'she / her',
    username: 'maya_sheridan',
    course: 'BUSM 1872 & IXD',
    campus: 'Trafalgar Campus (Oakville)',
    faculty: 'Faculty of Animation, Arts & Design (FAAD)',
    program: 'Honours Bachelor of Interaction Design (IXD)',
    academicYear: 'Year 3 • Class of 2027',
    bio: 'Designing playful, accessible interfaces for student collaboration. Currently building prototypes for the Nova Design Hackathon! 🚀',
    tags: ['UI/UX Design', 'Design Systems', 'BUSM 1872', 'Figma MCP'],
    isGuest: false
  };

  let currentProfile = null;

  function getProfileData() {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        currentProfile = { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
        return currentProfile;
      }
    } catch (e) {
      console.warn('Error reading profile.', e);
    }
    currentProfile = { ...DEFAULT_PROFILE };
    return currentProfile;
  }

  function saveProfileData(profile) {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      localStorage.setItem(ONBOARDED_KEY, 'true');
    } catch (e) {
      console.warn('Error saving profile.', e);
    }
  }

  function renderProfile(profile) {
    const bindText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text || '';
    };

    bindText('display-name', profile.fullName);
    bindText('display-pronouns', profile.pronouns);
    bindText('display-username', `@${(profile.username || '').replace('@', '')}`);
    bindText('display-course', profile.course || 'BUSM 1872 & IXD');
    bindText('display-campus', profile.campus);
    bindText('display-faculty', profile.faculty);
    bindText('display-program', profile.program);
    bindText('display-bio', profile.bio);

    const yearEl = document.getElementById('display-year');
    if (yearEl) yearEl.textContent = profile.academicYear || 'Year 3 • Class of 2027';

    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl && profile.avatar) {
      avatarEl.src = profile.avatar;
    }

    const tagsContainer = document.getElementById('display-tags');
    if (tagsContainer && Array.isArray(profile.tags)) {
      tagsContainer.innerHTML = '';
      profile.tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        tagsContainer.appendChild(span);
      });
    }
  }

  // --------------------------------------------------------------------------
  // 2. Ephemeral Room State & Operations
  // --------------------------------------------------------------------------
  function getInitialSeedRooms() {
    const now = Date.now();
    return [
      {
        roomId: 'BUSM-1872-01',
        courseTopic: 'BUSM 1872',
        hostName: 'Maya Patel',
        createdAt: now - 3600000,
        expiresAt: now + 23 * 3600000,
        status: 'active',
        unreadCount: 2,
        participants: [
          { id: 'p1', name: 'Maya Patel', initial: 'M', color: 'circle-color-navy', isHost: true },
          { id: 'p2', name: 'Jordan Lee', initial: 'J', color: 'circle-color-cyan', isHost: false },
          { id: 'p3', name: 'Chris Chen', initial: 'C', color: 'circle-color-magenta', isHost: false }
        ],
        messages: [
          {
            id: 'm-seed-1',
            sender: 'Jordan Lee',
            senderInitial: 'J',
            isHost: false,
            text: 'Hey team! Anyone looking over the BUSM 1872 case study for section 4?',
            timestamp: now - 1800000
          },
          {
            id: 'm-seed-2',
            sender: 'Maya Patel',
            senderInitial: 'M',
            isHost: true,
            text: 'Yes! Sitting near the Trafalgar B-wing collaborative tables right now.',
            timestamp: now - 900000
          }
        ]
      },
      {
        roomId: 'COMP-3254-02',
        courseTopic: 'COMP 3254',
        hostName: 'Samira Khan',
        createdAt: now - 5400000,
        expiresAt: now + 20 * 3600000,
        status: 'active',
        unreadCount: 1,
        participants: [
          { id: 'p4', name: 'Samira Khan', initial: 'S', color: 'circle-color-lime', isHost: true },
          { id: 'p5', name: 'Alex Rivera', initial: 'A', color: 'circle-color-cyan', isHost: false },
          { id: 'p6', name: 'Devon Patel', initial: 'D', color: 'circle-color-navy', isHost: false }
        ],
        messages: [
          {
            id: 'm-comp-1',
            sender: 'Samira Khan',
            senderInitial: 'S',
            isHost: true,
            text: 'Has anyone started the API sync assignment for COMP 3254?',
            timestamp: now - 3600000
          }
        ]
      },
      {
        roomId: 'SYS-DESIGN-03',
        courseTopic: 'System Design',
        hostName: 'Liam Wright',
        createdAt: now - 7200000,
        expiresAt: now + 18 * 3600000,
        status: 'active',
        unreadCount: 0,
        participants: [
          { id: 'p7', name: 'Liam Wright', initial: 'L', color: 'circle-color-magenta', isHost: true },
          { id: 'p8', name: 'Elena Rostova', initial: 'E', color: 'circle-color-lime', isHost: false },
          { id: 'p9', name: 'Marcus Brody', initial: 'M', color: 'circle-color-navy', isHost: false }
        ],
        messages: [
          {
            id: 'm-sys-1',
            sender: 'Liam Wright',
            senderInitial: 'L',
            isHost: true,
            text: 'System Design group: wireframes and accessibility state machine are ready.',
            timestamp: now - 5000000
          }
        ]
      },
      {
        roomId: 'NARR-2-3-04',
        courseTopic: 'Narrative 2_3',
        hostName: 'Chloe Bennett',
        createdAt: now - 86400000 * 5,
        expiresAt: now - 86400000 * 4,
        status: 'recent',
        unreadCount: 0,
        participants: [
          { id: 'p10', name: 'Chloe Bennett', initial: 'C', color: 'circle-color-cyan', isHost: true },
          { id: 'p11', name: 'Zoe Martin', initial: 'Z', color: 'circle-color-navy', isHost: false },
          { id: 'p12', name: 'Noah Davis', initial: 'N', color: 'circle-color-magenta', isHost: false }
        ],
        messages: [
          {
            id: 'm-narr-1',
            sender: 'Chloe Bennett',
            senderInitial: 'C',
            isHost: true,
            text: 'Character script dialogue notes uploaded from last week.',
            timestamp: now - 86400000 * 5
          }
        ]
      },
      {
        roomId: 'PROF-PRAC-05',
        courseTopic: 'Professional Practices',
        hostName: 'Marcus Brody',
        createdAt: now - 86400000 * 12,
        expiresAt: now - 86400000 * 11,
        status: 'recent',
        unreadCount: 0,
        participants: [
          { id: 'p13', name: 'Marcus Brody', initial: 'M', color: 'circle-color-navy', isHost: true },
          { id: 'p14', name: 'Priya Sharma', initial: 'P', color: 'circle-color-lime', isHost: false },
          { id: 'p15', name: 'Hannah Lee', initial: 'H', color: 'circle-color-cyan', isHost: false }
        ],
        messages: [
          {
            id: 'm-prof-1',
            sender: 'Marcus Brody',
            senderInitial: 'M',
            isHost: true,
            text: 'Portfolio critique rubric and presentation deck links.',
            timestamp: now - 86400000 * 12
          }
        ]
      }
    ];
  }

  function getAllRooms() {
    let rooms = [];
    try {
      const stored = localStorage.getItem(ROOMS_STORAGE_KEY);
      if (stored) {
        rooms = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading rooms from storage.', e);
    }
    const seed = getInitialSeedRooms();
    if (!rooms || rooms.length === 0) {
      try {
        localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(seed));
      } catch (e) {}
      return seed;
    }
    // Ensure all Figma 38:1238 seed rooms are present
    let updated = false;
    seed.forEach(sRoom => {
      if (!rooms.some(r => r.roomId === sRoom.roomId)) {
        rooms.push(sRoom);
        updated = true;
      }
    });
    if (updated) {
      try {
        localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
      } catch (e) {}
    }
    return rooms;
  }

  function saveAllRooms(rooms, updateBadges = true) {
    try {
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
      if (updateBadges) {
        updateNavBadges(rooms);
      }
    } catch (e) {
      console.warn('Error saving rooms to storage.', e);
    }
  }

  function getRoomById(roomId) {
    const rooms = getAllRooms();
    return rooms.find(r => r.roomId === roomId) || null;
  }

  function createNewRoom(hostProfile, courseTag = 'BUSM 1872') {
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const cleanTopic = (courseTag || 'BUSM 1872').trim().replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
    const roomId = `${cleanTopic.substring(0, 9)}-${randomHex}`;
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000;

    const hostInitial = (hostProfile.fullName || 'H').charAt(0).toUpperCase();

    const newRoom = {
      roomId: roomId,
      courseTopic: courseTag || 'BUSM 1872',
      hostName: hostProfile.fullName,
      createdAt: now,
      expiresAt: expiresAt,
      status: 'active',
      unreadCount: 0,
      participants: [
        {
          id: `host-${now}`,
          name: hostProfile.fullName,
          initial: hostInitial,
          color: 'circle-color-navy',
          isHost: true
        }
      ],
      messages: [
        {
          id: `sys-${now}`,
          sender: 'QuickChat System',
          senderInitial: 'Q',
          isSystem: true,
          text: `⚡ Room ${roomId} created for [${courseTag}]. Share the QR code with nearby classmates to join as anonymous guests! Auto-deletes in 24 hours.`,
          timestamp: now
        }
      ]
    };

    const rooms = getAllRooms();
    rooms.unshift(newRoom);
    saveAllRooms(rooms);

    broadcastMessage({
      type: 'ROOM_CREATED',
      room: newRoom
    });

    return newRoom;
  }

  function deleteRoom(roomId, reason = 'user_deleted') {
    let rooms = getAllRooms();
    const targetRoom = rooms.find(r => r.roomId === roomId);
    rooms = rooms.filter(r => r.roomId !== roomId);
    saveAllRooms(rooms);

    broadcastMessage({
      type: 'ROOM_DELETED',
      roomId: roomId,
      reason: reason
    });

    return targetRoom;
  }

  function purgeExpiredRooms() {
    const now = Date.now();
    let rooms = getAllRooms();
    const remaining = rooms.filter(r => r.status === 'recent' || r.expiresAt > now || (r.createdAt && r.createdAt > now - 30 * 86400000));
    if (remaining.length !== rooms.length) {
      saveAllRooms(remaining);
      renderRoomsList();
    }
  }

  function getRemainingTTL(expiresAt) {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  }

  // --------------------------------------------------------------------------
  // 3. QR Code Generator Integration
  // --------------------------------------------------------------------------
  function generateQRCode(elementId, url) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = '';

    if (window.QRCode) {
      try {
        new window.QRCode(container, {
          text: url,
          width: 176,
          height: 176,
          colorDark: '#003767',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M
        });
      } catch (err) {
        console.error('QR code rendering error:', err);
        container.innerHTML = `<p style="font-size: 11px; color: #64748b;">${url}</p>`;
      }
    } else {
      container.innerHTML = `
        <div style="padding: 10px; text-align: center; font-size: 11px; word-break: break-all;">
          <strong>Scan URL:</strong><br>${url}
        </div>`;
    }
  }

  // --------------------------------------------------------------------------
  // 4. View Switching & Navigation Engine
  // --------------------------------------------------------------------------
  let currentActiveRoomId = null;
  let isGuestInCurrentRoom = false;
  let activeFilterTab = 'active';

  function switchView(viewName) {
    const viewLogin = document.getElementById('view-login') || document.getElementById('view-onboarding');
    const viewHome = document.getElementById('view-home');
    const viewRoom = document.getElementById('view-room');
    const viewProfile = document.getElementById('view-profile');

    const pageTitle = document.getElementById('page-title');
    const btnTopGenerateQr = document.getElementById('btn-top-generate-qr');
    const btnEditDesktop = document.getElementById('btn-edit-desktop');

    // Hide all views
    if (viewLogin) viewLogin.style.display = 'none';
    if (viewHome) viewHome.style.display = 'none';
    if (viewRoom) viewRoom.style.display = 'none';
    if (viewProfile) viewProfile.style.display = 'none';

    // Top action buttons
    if (btnTopGenerateQr) btnTopGenerateQr.style.display = 'none';
    if (btnEditDesktop) btnEditDesktop.style.display = 'none';

    if (viewName !== 'room') {
      stopLiveSync();
    }

    // Reset active nav items
    const allNavButtons = document.querySelectorAll('.dock-tab, .sidebar-item');
    allNavButtons.forEach(b => b.classList.remove('active'));

    const appScreen = document.getElementById('app-screen');
    const mobileBottomDock = document.querySelector('.mobile-bottom-dock');

    if (viewName === 'room') {
      document.body.classList.add('in-room-view');
      if (appScreen) appScreen.classList.add('in-room-view');
      if (mobileBottomDock) mobileBottomDock.style.display = 'none';
    } else {
      document.body.classList.remove('in-room-view');
      if (appScreen) appScreen.classList.remove('in-room-view');
      if (mobileBottomDock) mobileBottomDock.style.display = '';
    }

    if (viewName === 'login' || viewName === 'onboarding') {
      if (viewLogin) viewLogin.style.display = 'flex';
      if (pageTitle) pageTitle.textContent = 'Login to QuickChat';
      document.getElementById('sidebar-login')?.classList.add('active');

      // Populate input fields if profile exists
      const nameInp = document.getElementById('login-input-name');
      const pronounsInp = document.getElementById('login-input-pronouns');
      const courseInp = document.getElementById('login-input-course');
      const campusInp = document.getElementById('login-input-campus');

      const profile = currentProfile || getProfileData();
      if (nameInp && !nameInp.value && profile && profile.fullName && !profile.isGuest) {
        nameInp.value = profile.fullName;
      }
      if (pronounsInp && !pronounsInp.value && profile && profile.pronouns) {
        pronounsInp.value = profile.pronouns;
      }
      if (courseInp && !courseInp.value && profile && profile.course) {
        courseInp.value = profile.course;
      }
      if (campusInp && profile && profile.campus) {
        campusInp.value = profile.campus;
      }
    } else if (viewName === 'home' || viewName === 'chats') {
      if (viewHome) viewHome.style.display = 'flex';
      if (pageTitle) pageTitle.textContent = 'QuickChat Hub';
      if (btnTopGenerateQr) btnTopGenerateQr.style.display = 'inline-flex';
      document.getElementById('sidebar-home')?.classList.add('active');
      document.getElementById('dock-home')?.classList.add('active');
      renderRoomsList();
    } else if (viewName === 'room') {
      if (viewRoom) viewRoom.style.display = 'flex';
      if (pageTitle) pageTitle.textContent = currentActiveRoomId || 'Chat Room';
      document.getElementById('sidebar-chats')?.classList.add('active');
      document.getElementById('dock-chat')?.classList.add('active');
    } else if (viewName === 'profile') {
      if (viewProfile) viewProfile.style.display = 'flex';
      if (pageTitle) pageTitle.textContent = 'Student Profile';
      if (btnEditDesktop) btnEditDesktop.style.display = 'inline-flex';
      document.getElementById('sidebar-profile')?.classList.add('active');
      document.getElementById('dock-profile')?.classList.add('active');
    }
  }

  function updateNavBadges(providedRooms) {
    let rooms = providedRooms;
    if (!rooms) {
      try {
        const stored = localStorage.getItem(ROOMS_STORAGE_KEY);
        rooms = stored ? JSON.parse(stored) : [];
      } catch (e) {
        rooms = [];
      }
    }
    const activeCount = Array.isArray(rooms) ? rooms.length : 0;
    const sidebarCount = document.getElementById('sidebar-chat-count');
    const dockDot = document.getElementById('dock-chat-dot');

    if (sidebarCount) {
      sidebarCount.textContent = activeCount;
      sidebarCount.hidden = activeCount === 0;
    }
    if (dockDot) {
      dockDot.hidden = activeCount === 0;
    }
    const unreadEl = document.getElementById('home-unread-summary');
    if (unreadEl) {
      const totalUnread = Array.isArray(rooms) ? rooms.reduce((acc, r) => acc + (r.unreadCount || 0), 0) : 0;
      unreadEl.textContent = `${totalUnread} unread messages`;
      unreadEl.hidden = totalUnread === 0;
    }
  }

  // --------------------------------------------------------------------------
  // 5. Active Chat Room UI & Message Stream
  // --------------------------------------------------------------------------
  function openChatRoom(roomId, asGuest = false) {
    const room = getRoomById(roomId);
    if (!room) {
      alert('This room has expired or been deleted.');
      switchView('home');
      return;
    }

    currentActiveRoomId = roomId;
    isGuestInCurrentRoom = asGuest;
    room.unreadCount = 0;
    saveAllRooms(getAllRooms().map(r => (r.roomId === room.roomId ? room : r)));

    // Set topic & header
    const topicBadge = document.getElementById('room-topic-badge');
    const headerTitle = document.getElementById('room-header-title');
    if (topicBadge) topicBadge.textContent = room.courseTopic || 'BUSM 1872';
    if (headerTitle) headerTitle.textContent = `Room ${room.roomId}`;

    // Render participant initial clusters (Figma 19:436)
    renderRoomAvatarCluster(room.participants);

    updateRoomTTLCountdown(room.expiresAt);
    renderMessageStream(room.messages);
    switchView('room');

    // Ensure scrolling down to latest message once room becomes visible
    requestAnimationFrame(() => {
      const container = document.getElementById('chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
    setTimeout(() => {
      const container = document.getElementById('chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 60);

    startLiveSync(roomId);

    setTimeout(() => {
      document.getElementById('chat-input')?.focus();
    }, 150);
  }

  function renderRoomAvatarCluster(participants = []) {
    const container = document.getElementById('room-avatar-cluster');
    if (!container) return;
    container.innerHTML = '';

    participants.forEach((p, index) => {
      const circle = document.createElement('div');
      circle.className = `avatar-initial-circle ${p.color || INITIAL_COLORS[index % INITIAL_COLORS.length]}`;
      circle.textContent = p.initial || p.name.charAt(0).toUpperCase();
      circle.title = `${p.name} ${p.isHost ? '(Host)' : ''}`;
      container.appendChild(circle);
    });

    const countText = document.createElement('span');
    countText.className = 'participant-count-text';
    countText.textContent = `${participants.length} connected`;
    countText.style.marginLeft = '8px';
    container.appendChild(countText);
  }

  function updateRoomTTLCountdown(expiresAt) {
    const countdownEl = document.getElementById('room-ttl-countdown');
    if (countdownEl) {
      countdownEl.textContent = getRemainingTTL(expiresAt);
    }
  }

  // State for accessibility speech tools and privacy settings
  let ttsEnabled = false;
  let currentSpeechButton = null;
  let currentUtterance = null;
  const roomPrivacySettings = {}; // maps roomId -> boolean (true = shared, false = anonymous)

  function stopSpeaking() {
    if (currentSpeechButton) {
      currentSpeechButton.setAttribute('aria-pressed', 'false');
      currentSpeechButton.textContent = 'Listen';
    }
    currentSpeechButton = null;
    currentUtterance = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function speakMessage(button, text) {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      const voiceStatus = document.getElementById('voiceStatus');
      if (voiceStatus) voiceStatus.textContent = 'Text-to-speech is not supported in this browser.';
      return;
    }
    if (currentSpeechButton === button && window.speechSynthesis.speaking) {
      stopSpeaking();
      return;
    }
    stopSpeaking();
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = navigator.language || 'en-US';
      currentUtterance = utterance;
      currentSpeechButton = button;
      button.setAttribute('aria-pressed', 'true');
      button.textContent = 'Stop';
      utterance.onend = () => {
        if (currentUtterance === utterance) stopSpeaking();
      };
      utterance.onerror = () => {
        if (currentUtterance === utterance) {
          stopSpeaking();
          const voiceStatus = document.getElementById('voiceStatus');
          if (voiceStatus) voiceStatus.textContent = 'Could not read this message aloud.';
        }
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      stopSpeaking();
    }
  }

  // Web Speech API: General Text-to-Speech playback
  function speakText(text) {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = navigator.language || 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Text to speech error:', err);
    }
  }

  // Web Speech API: Speech-to-Text Voice Dictation (ChatWave & Figma)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function setupSpeechRecognition(targetInputId, triggerBtnId) {
    const triggerBtn = document.getElementById(triggerBtnId);
    const targetInput = document.getElementById(targetInputId);
    const voiceStatus = document.getElementById('voiceStatus');
    if (!triggerBtn || !targetInput) return;

    if (!SpeechRecognition) {
      triggerBtn.title = 'Speech recognition not supported in this browser';
      triggerBtn.style.opacity = '0.4';
      if (voiceStatus && targetInputId === 'chat-input') {
        voiceStatus.textContent = 'Voice dictation is not supported in this browser. You can still type your message.';
      }
      return;
    }

    let recognition = null;
    let isListening = false;

    triggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isListening && recognition) {
        recognition.stop();
        return;
      }

      try {
        recognition = new SpeechRecognition();
        recognition.lang = navigator.language || 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isListening = true;
          triggerBtn.classList.add('recording');
          triggerBtn.setAttribute('aria-pressed', 'true');
          targetInput.placeholder = '🎙️ Listening... speak now';
          if (voiceStatus && targetInputId === 'chat-input') {
            voiceStatus.textContent = 'Listening… Speak your message.';
          }
        };

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results).slice(event.resultIndex).map(res => res[0].transcript).join(' ').trim();
          if (targetInput && transcript) {
            const separator = targetInput.value.trim() ? ' ' : '';
            targetInput.value = targetInput.value + separator + transcript;
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            if (voiceStatus && targetInputId === 'chat-input') {
              voiceStatus.textContent = 'Added dictated text. Review it, then tap send.';
            }
          }
        };

        recognition.onerror = (err) => {
          console.warn('Speech recognition error:', err.error);
          isListening = false;
          triggerBtn.classList.remove('recording');
          triggerBtn.setAttribute('aria-pressed', 'false');
          const messages = {
            'not-allowed': 'Microphone access was denied. Allow microphone access in your browser settings.',
            'service-not-allowed': 'The browser speech-recognition service is unavailable.',
            'no-speech': 'No speech was detected. Tap the microphone to try again.',
            'audio-capture': 'No microphone was found. Check your device microphone.',
            'network': 'Voice recognition needs an internet connection.'
          };
          if (voiceStatus && targetInputId === 'chat-input') {
            voiceStatus.textContent = messages[err.error] || 'Voice dictation failed. Please try again or type your message.';
          }
        };

        recognition.onend = () => {
          isListening = false;
          triggerBtn.classList.remove('recording');
          triggerBtn.setAttribute('aria-pressed', 'false');
          if (targetInputId === 'chat-input') {
            targetInput.placeholder = 'Type in message here...';
            if (voiceStatus && voiceStatus.textContent.startsWith('Listening')) {
              voiceStatus.textContent = 'Voice input stopped.';
            }
          }
        };

        recognition.start();
      } catch (err) {
        console.warn('Could not start recognition:', err);
        isListening = false;
        triggerBtn.classList.remove('recording');
        triggerBtn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // Export Notes / Chat Transcript (Figma 38:1269 download action)
  function exportChatNotes(roomId) {
    const room = getRoomById(roomId);
    if (!room) return;

    let md = `# QuickChat Notes: ${room.courseTopic || 'Study Session'}\n`;
    md += `**Room Code:** ${room.roomId}\n`;
    md += `**Date:** ${new Date(room.createdAt).toLocaleDateString()} ${new Date(room.createdAt).toLocaleTimeString()}\n`;
    md += `**Participants:** ${(room.participants || []).map(p => p.name).join(', ')}\n\n`;
    md += `---\n\n`;

    (room.messages || []).forEach(m => {
      if (m.isSystem) {
        md += `*System: ${m.text}*\n\n`;
      } else {
        const author = m.author || m.sender || 'Anonymous';
        const msgTime = m.at ? new Date(m.at) : (m.timestamp ? new Date(m.timestamp) : new Date());
        const time = msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        md += `**${author}** (${time}):\n${m.text}\n\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(room.courseTopic || 'QuickChat').replace(/[^a-zA-Z0-9]/g, '_')}_Notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const safe = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderMessageStream(messages) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    stopSpeaking();
    container.innerHTML = '';

    // Date/Conversation pill from ChatWave format
    const datePill = document.createElement('span');
    datePill.className = 'date-pill';
    datePill.textContent = 'Conversation';
    container.appendChild(datePill);

    (messages || []).forEach(msg => {
      if (msg.isSystem) {
        const sysDiv = document.createElement('div');
        sysDiv.className = 'date-pill system-pill';
        sysDiv.textContent = msg.text;
        container.appendChild(sysDiv);
        return;
      }

      const isMine = msg.senderId ? (msg.senderId === myClientId) : (isGuestInCurrentRoom ? !msg.isHost : msg.isHost);
      const authorName = msg.author || msg.sender || (isMine ? 'You' : 'Anonymous Student');
      const authorInitial = msg.senderInitial || (authorName || 'U').charAt(0).toUpperCase();

      const msgEl = document.createElement('div');
      msgEl.className = `message ${isMine ? 'mine' : ''}`;

      // Author header (ChatWave format)
      const authorEl = document.createElement('div');
      authorEl.className = 'author';
      const initialDot = document.createElement('span');
      initialDot.className = 'author-avatar-dot';
      initialDot.textContent = authorInitial;
      const authorText = document.createElement('span');
      authorText.textContent = isMine ? 'You' : authorName;
      authorEl.appendChild(initialDot);
      authorEl.appendChild(authorText);

      // Message text with line breaks (ChatWave format)
      const textEl = document.createElement('div');
      textEl.className = 'message-text';
      textEl.innerHTML = safe(msg.text).replace(/\n/g, '<br>');

      // Message footer (Listen speech button + timestamp)
      const footerEl = document.createElement('div');
      footerEl.className = 'message-footer';

      const speakBtn = document.createElement('button');
      speakBtn.type = 'button';
      speakBtn.className = 'speak-message';
      speakBtn.setAttribute('aria-label', `Read message from ${safe(authorName)} aloud`);
      speakBtn.setAttribute('aria-pressed', 'false');
      speakBtn.textContent = 'Listen';
      speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakMessage(speakBtn, msg.text);
      });

      const timeEl = document.createElement('div');
      timeEl.className = 'footer';
      const msgDate = msg.at ? new Date(msg.at) : (msg.timestamp ? new Date(msg.timestamp) : new Date());
      timeEl.textContent = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      footerEl.appendChild(speakBtn);
      footerEl.appendChild(timeEl);

      msgEl.appendChild(authorEl);
      msgEl.appendChild(textEl);
      msgEl.appendChild(footerEl);

      container.appendChild(msgEl);
    });

    container.scrollTop = container.scrollHeight;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }

  function sendChatMessage(text) {
    if (!currentActiveRoomId || !text.trim()) return;
    const room = getRoomById(currentActiveRoomId);
    if (!room) return;

    const profile = getProfileData();
    const guestIdentity = localStorage.getItem(GUEST_ID_KEY) || 'Nova Guest';

    // Privacy setting check: If anonymous is chosen for this room, mask identity
    const isShared = roomPrivacySettings[currentActiveRoomId] !== false;
    let senderName = isGuestInCurrentRoom ? guestIdentity : (isShared ? profile.fullName : 'Anonymous Student');
    let senderInitial = isShared ? senderName.charAt(0).toUpperCase() : 'A';

    const now = Date.now();
    const newMessage = {
      id: (globalThis.crypto?.randomUUID?.()) || `msg-${now}-${Math.random().toString(36).substring(2, 6)}`,
      author: senderName,
      sender: senderName,
      senderInitial: senderInitial,
      senderId: myClientId,
      isHost: !isGuestInCurrentRoom,
      text: text.trim(),
      at: new Date(now).toISOString(),
      timestamp: now
    };

    room.messages.push(newMessage);
    const allRooms = getAllRooms().map(r => (r.roomId === room.roomId ? room : r));
    saveAllRooms(allRooms);

    renderMessageStream(room.messages);

    if (ttsEnabled) {
      speakText(newMessage.text);
    }

    // Sync via broadcastChannel for same-browser tabs
    broadcastMessage({
      type: 'NEW_MESSAGE',
      roomId: room.roomId,
      message: newMessage
    });

    // Sync via lightweight server for cross-device phones/laptops
    try {
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.roomId, message: newMessage })
      }).catch(() => {});
    } catch (e) {}
  }

  // --------------------------------------------------------------------------
  // 6. Rooms List Hub Rendering (Figma 16:74 & 30:593)
  // --------------------------------------------------------------------------
  function renderRoomsList() {
    const listContainer = document.getElementById('home-rooms-list');
    if (!listContainer) return;

    purgeExpiredRooms();
    const allRooms = getAllRooms();
    updateNavBadges();

    const now = Date.now();
    const rooms = allRooms.filter(r => {
      if (activeFilterTab === 'active') {
        return r.status !== 'recent' && (r.expiresAt ? r.expiresAt > now : true);
      } else {
        return r.status === 'recent' || (r.expiresAt && r.expiresAt <= now);
      }
    });

    if (rooms.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-rooms-state">
          <div class="empty-state-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h4>${activeFilterTab === 'active' ? 'No Active QuickChat Rooms' : 'No Past 30 Days Chats'}</h4>
          <p>${activeFilterTab === 'active' 
            ? 'Tap <strong>"Generate QR"</strong> above to launch an instant ephemeral chat for your course, group project, or campus meet!'
            : 'Older collaborative chats from the last month will appear here for review.'}</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    rooms.forEach(room => {
      const card = document.createElement('div');
      card.className = 'room-card';

      // Build participant initial chips (Component 19:436)
      const participantPills = (room.participants || []).slice(0, 4).map((p, idx) => {
        const color = p.color || INITIAL_COLORS[idx % INITIAL_COLORS.length];
        return `<div class="avatar-initial-circle ${color}" title="${p.name}">${p.initial || p.name.charAt(0).toUpperCase()}</div>`;
      }).join('');

      const lastMsg = room.messages[room.messages.length - 1];
      const lastMsgText = lastMsg ? (lastMsg.isSystem ? 'Room opened' : `${lastMsg.sender}: ${lastMsg.text}`) : 'No messages yet';

      card.innerHTML = `
        <div class="room-card-header">
          <span class="topic-tag-pill">${room.courseTopic || 'BUSM 1872'}</span>
          <span class="room-time-left-tag">⏳ ${getRemainingTTL(room.expiresAt)}</span>
        </div>
        <div class="room-card-body">
          <div class="participant-cluster-row">
            <div class="avatar-initials-stack">
              ${participantPills}
            </div>
            <span class="participant-count-text">${(room.participants || []).length} joined</span>
          </div>
          <div class="room-last-msg-preview">${lastMsgText}</div>
        </div>
        <div class="room-card-footer">
          <button class="btn-open-room" data-room-id="${room.roomId}">Open Chat</button>
          <button class="btn-qr-icon-trigger" data-room-id="${room.roomId}" title="Show QR Code">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
        </div>
      `;

      card.querySelector('.btn-open-room').addEventListener('click', () => {
        openChatRoom(room.roomId, false);
      });

      card.querySelector('.btn-qr-icon-trigger').addEventListener('click', () => {
        showQRModal(room.roomId);
      });

      listContainer.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // 7. QR Modal Controller & Network Resolver
  // --------------------------------------------------------------------------
  let detectedLanIp = '10.16.208.227';
  let qrTargetMode = 'network'; // 'network' (for phones) or 'localhost' (for same machine)
  let activeQRRoomId = null;
  let liveSyncTimer = null;

  // Auto-fetch LAN IP from ip.json or /api/ip
  function refreshDetectedLanIp() {
    fetch('/ip.json')
      .then(r => r.json())
      .then(data => {
        if (data && data.ip) {
          detectedLanIp = data.ip;
          if (activeQRRoomId) {
            const room = getRoomById(activeQRRoomId);
            if (room) renderQRContent(room);
          }
        }
      })
      .catch(() => {
        fetch('/api/ip')
          .then(r => r.json())
          .then(data => {
            if (data && data.ip) {
              detectedLanIp = data.ip;
              if (activeQRRoomId) {
                const room = getRoomById(activeQRRoomId);
                if (room) renderQRContent(room);
              }
            }
          })
          .catch(() => {});
      });
  }
  refreshDetectedLanIp();

  function getEffectiveOrigin() {
    const customHost = localStorage.getItem('novahacks_custom_host');
    if (customHost) {
      return customHost.startsWith('http://') || customHost.startsWith('https://')
        ? customHost.replace(/\/+$/, '')
        : `http://${customHost.replace(/\/+$/, '')}`;
    }

    if (qrTargetMode === 'network') {
      const hostname = window.location ? window.location.hostname : 'localhost';
      const protocol = window.location ? window.location.protocol : 'http:';
      const isLoopback = !hostname || hostname === 'localhost' || hostname === '127.0.0.1' || protocol === 'file:';
      const port = (window.location && window.location.port) || '3000';
      if (isLoopback) {
        return `http://${detectedLanIp}:${port}`;
      }
      return (window.location && window.location.origin) || `http://${detectedLanIp}:${port}`;
    } else {
      // Localhost mode
      if (window.location && window.location.protocol === 'file:') {
        return 'http://localhost:3000';
      }
      return (window.location && window.location.origin) || 'http://localhost:3000';
    }
  }

  function renderQRContent(room) {
    const urlInput = document.getElementById('qr-room-url-input');
    const networkAlert = document.getElementById('qr-network-alert');
    const statusText = document.getElementById('qr-network-status-text');
    const hintText = document.getElementById('qr-network-hint');
    const detectedIpLabel = document.getElementById('qr-detected-ip-label');
    const tabNetwork = document.getElementById('qr-tab-network');
    const tabLocalhost = document.getElementById('qr-tab-localhost');

    const origin = getEffectiveOrigin();
    const queryParams = new URLSearchParams({
      room: room.roomId,
      topic: room.courseTopic || 'BUSM 1872',
      host: room.hostName || 'Maya Patel',
      expires: room.expiresAt || (Date.now() + 24 * 3600000)
    });

    const isFile = window.location && window.location.protocol === 'file:';
    const basePath = (window.location && window.location.pathname) || '/';
    const cleanPath = basePath.endsWith('.html') || basePath === '/' ? basePath : `${basePath}/`;
    const shareUrl = `${origin}${cleanPath}?${queryParams.toString()}`;

    if (urlInput) urlInput.value = shareUrl;

    if (qrTargetMode === 'network') {
      tabNetwork?.classList.add('active');
      tabLocalhost?.classList.remove('active');
      networkAlert?.classList.remove('alert-warning');
      if (detectedIpLabel) detectedIpLabel.textContent = origin;
      if (statusText) statusText.innerHTML = `Network URL: <strong>${origin}</strong>`;
      if (hintText) hintText.textContent = `Phones on the same Wi-Fi / hotspot can scan and join instantly.`;
    } else {
      tabLocalhost?.classList.add('active');
      tabNetwork?.classList.remove('active');
      networkAlert?.classList.add('alert-warning');
      if (statusText) statusText.innerHTML = `⚠️ Localhost Mode: <strong>${origin}</strong>`;
      if (hintText) hintText.textContent = `Only works on this computer. Switch to "Phone / Other Devices" to scan with a phone!`;
    }

    generateQRCode('qr-code-element', shareUrl);
  }

  function showQRModal(roomId) {
    const room = getRoomById(roomId);
    if (!room) return;
    activeQRRoomId = roomId;

    const modal = document.getElementById('qr-modal-backdrop');
    const codeDisplay = document.getElementById('qr-room-code-display');
    const topicBadge = document.getElementById('qr-topic-badge');

    if (codeDisplay) codeDisplay.textContent = roomId;
    if (topicBadge) topicBadge.textContent = room.courseTopic || 'BUSM 1872';

    // Register room with sync server if running
    try {
      fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: room })
      }).catch(() => {});
    } catch (e) {}

    renderQRContent(room);

    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');

    const enterBtn = document.getElementById('btn-enter-room-now');
    if (enterBtn) {
      enterBtn.onclick = () => {
        modal?.classList.remove('open');
        openChatRoom(roomId, false);
      };
    }
  }

  // Cross-device live sync polling
  function startLiveSync(roomId) {
    if (liveSyncTimer) clearInterval(liveSyncTimer);
    liveSyncTimer = setInterval(() => {
      if (currentActiveRoomId !== roomId) {
        clearInterval(liveSyncTimer);
        return;
      }
      const room = getRoomById(roomId);
      if (!room) return;
      const lastTime = room.messages.length > 0
        ? (room.messages[room.messages.length - 1].timestamp || 0)
        : 0;

      fetch(`/api/sync?roomId=${encodeURIComponent(roomId)}&since=${lastTime}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data && Array.isArray(data.messages) && data.messages.length > 0) {
            let changed = false;
            data.messages.forEach(msg => {
              if (!room.messages.some(m => m.id === msg.id)) {
                room.messages.push(msg);
                changed = true;
              }
            });
            if (changed) {
              const rooms = getAllRooms().map(r => (r.roomId === room.roomId ? room : r));
              saveAllRooms(rooms);
              renderMessageStream(room.messages);
            }
          }
        })
        .catch(() => {});
    }, 1200);
  }

  function stopLiveSync() {
    if (liveSyncTimer) {
      clearInterval(liveSyncTimer);
      liveSyncTimer = null;
    }
  }

  // --------------------------------------------------------------------------
  // 8. Cross-Tab & Cross-Window Broadcast Protocol
  // --------------------------------------------------------------------------
  function broadcastMessage(data) {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(data);
      } catch (e) {
        console.warn('Broadcast failed.', e);
      }
    }
  }

  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'NEW_MESSAGE') {
        if (currentActiveRoomId === data.roomId) {
          const room = getRoomById(data.roomId);
          if (room) renderMessageStream(room.messages);
        }
        renderRoomsList();
      } else if (data.type === 'ROOM_CREATED') {
        renderRoomsList();
      } else if (data.type === 'PARTICIPANT_JOINED') {
        if (currentActiveRoomId === data.roomId) {
          const room = getRoomById(data.roomId);
          if (room) {
            renderMessageStream(room.messages);
            renderRoomAvatarCluster(room.participants);
          }
        }
        renderRoomsList();
      } else if (data.type === 'ROOM_DELETED') {
        if (currentActiveRoomId === data.roomId) {
          currentActiveRoomId = null;
          if (isGuestInCurrentRoom) {
            showGuestConversionModal();
          } else {
            alert('This conversation was ended and purged.');
            switchView('home');
          }
        }
        renderRoomsList();
      }
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key === ROOMS_STORAGE_KEY) {
      if (currentActiveRoomId) {
        const room = getRoomById(currentActiveRoomId);
        if (room) renderMessageStream(room.messages);
      }
      renderRoomsList();
    }
  });

  // --------------------------------------------------------------------------
  // 9. Post-Chat Conversion Modal (Guest Profile Creation)
  // --------------------------------------------------------------------------
  function showGuestConversionModal() {
    const modal = document.getElementById('guest-conversion-modal-backdrop');
    if (!modal) return;

    const guestNickname = localStorage.getItem(GUEST_ID_KEY) || 'Nova Student';
    const nameInput = document.getElementById('convert-name');
    if (nameInput) nameInput.value = guestNickname;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  // --------------------------------------------------------------------------
  // 10. Initialization & DOM Listeners
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    currentProfile = getProfileData();
    renderProfile(currentProfile);

    // Live clock for mobile status bar
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const timeEl = document.getElementById('status-time');
      if (timeEl) timeEl.textContent = `${hours % 12 || 12}:${minutes}`;
    };
    updateTime();
    setInterval(updateTime, 30000);

    // Periodic TTL ticker (every 15s)
    setInterval(() => {
      purgeExpiredRooms();
      if (currentActiveRoomId) {
        const room = getRoomById(currentActiveRoomId);
        if (room) {
          updateRoomTTLCountdown(room.expiresAt);
        } else {
          if (isGuestInCurrentRoom) {
            showGuestConversionModal();
          } else {
            alert('Room timer expired (24h reached). Room has been wiped.');
            switchView('home');
          }
          currentActiveRoomId = null;
        }
      }
    }, 15000);

    // Navigation Bindings
    document.getElementById('sidebar-home')?.addEventListener('click', () => switchView('home'));
    document.getElementById('dock-home')?.addEventListener('click', () => switchView('home'));

    document.getElementById('sidebar-chats')?.addEventListener('click', () => switchView('home'));
    document.getElementById('dock-chat')?.addEventListener('click', () => switchView('home'));

    document.getElementById('sidebar-profile')?.addEventListener('click', () => switchView('profile'));
    document.getElementById('dock-profile')?.addEventListener('click', () => switchView('profile'));

    document.getElementById('sidebar-login')?.addEventListener('click', () => switchView('login'));

    document.getElementById('brand-link')?.addEventListener('click', () => switchView('home'));
    document.getElementById('mobile-brand-link')?.addEventListener('click', () => switchView('home'));

    document.getElementById('btn-back')?.addEventListener('click', () => {
      if (currentActiveRoomId) {
        switchView('home');
      } else {
        switchView('home');
      }
    });

    document.getElementById('btn-leave-room')?.addEventListener('click', () => switchView('home'));

    // Figma Login Page Handlers (Figma 16:83)
    document.getElementById('btn-login-skip')?.addEventListener('click', () => {
      currentProfile.isGuest = true;
      if (!currentProfile.fullName || currentProfile.fullName.startsWith('Guest')) {
        currentProfile.fullName = `Guest #${Math.floor(100 + Math.random() * 900)}`;
      }
      saveProfileData(currentProfile);
      renderProfile(currentProfile);
      switchView('home');
    });

    document.getElementById('login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('login-input-name')?.value.trim();
      const pronouns = document.getElementById('login-input-pronouns')?.value.trim();
      const course = document.getElementById('login-input-course')?.value.trim();
      const campus = document.getElementById('login-input-campus')?.value;

      if (name) currentProfile.fullName = name;
      if (pronouns) currentProfile.pronouns = pronouns;
      if (course) currentProfile.course = course;
      if (campus) currentProfile.campus = campus;
      currentProfile.isGuest = false;

      saveProfileData(currentProfile);
      renderProfile(currentProfile);
      switchView('home');
    });

    // Legacy Onboarding Handlers (Fallback)
    document.getElementById('btn-skip-onboarding')?.addEventListener('click', () => {
      currentProfile.isGuest = true;
      currentProfile.fullName = `Guest #${Math.floor(100 + Math.random() * 900)}`;
      saveProfileData(currentProfile);
      renderProfile(currentProfile);
      switchView('home');
    });

    document.getElementById('onboarding-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('onboard-name')?.value.trim();
      const pronouns = document.getElementById('onboard-pronouns')?.value.trim();
      const course = document.getElementById('onboard-course')?.value.trim();
      const campus = document.getElementById('onboard-campus')?.value;

      currentProfile.fullName = name || currentProfile.fullName;
      currentProfile.pronouns = pronouns || 'they / them';
      currentProfile.course = course || 'BUSM 1872';
      currentProfile.campus = campus || currentProfile.campus;
      currentProfile.isGuest = false;

      saveProfileData(currentProfile);
      renderProfile(currentProfile);
      switchView('home');
    });

    // Room Generation Trigger
    const triggerGenerateQR = () => {
      const courseInput = document.getElementById('input-quick-course-tag');
      const courseTag = courseInput?.value.trim() || 'BUSM 1872';
      const newRoom = createNewRoom(currentProfile, courseTag);
      renderRoomsList();
      showQRModal(newRoom.roomId);
    };

    document.getElementById('btn-home-generate-qr')?.addEventListener('click', triggerGenerateQR);
    document.getElementById('btn-top-generate-qr')?.addEventListener('click', triggerGenerateQR);

    // QR Modal Controls
    document.getElementById('btn-close-qr-modal')?.addEventListener('click', () => {
      document.getElementById('qr-modal-backdrop')?.classList.remove('open');
    });

    document.getElementById('btn-copy-room-link')?.addEventListener('click', () => {
      const urlInput = document.getElementById('qr-room-url-input');
      const copyBtnText = document.getElementById('copy-btn-text');
      if (urlInput) {
        navigator.clipboard.writeText(urlInput.value).then(() => {
          if (copyBtnText) copyBtnText.textContent = 'Copied! ✓';
          setTimeout(() => {
            if (copyBtnText) copyBtnText.textContent = 'Copy Link';
          }, 2000);
        });
      }
    });

    // QR Target Switcher Tabs
    document.getElementById('qr-tab-network')?.addEventListener('click', () => {
      qrTargetMode = 'network';
      if (activeQRRoomId) {
        const room = getRoomById(activeQRRoomId);
        if (room) renderQRContent(room);
      }
    });

    document.getElementById('qr-tab-localhost')?.addEventListener('click', () => {
      qrTargetMode = 'localhost';
      if (activeQRRoomId) {
        const room = getRoomById(activeQRRoomId);
        if (room) renderQRContent(room);
      }
    });

    // Custom Host Drawer Controls
    const customHostDrawer = document.getElementById('custom-host-drawer');
    const inputCustomHost = document.getElementById('input-custom-host');
    document.getElementById('btn-toggle-custom-host')?.addEventListener('click', () => {
      customHostDrawer?.classList.toggle('hidden');
      if (inputCustomHost && !inputCustomHost.value) {
        inputCustomHost.value = localStorage.getItem('novahacks_custom_host') || `${detectedLanIp}:3000`;
      }
    });

    document.getElementById('btn-apply-custom-host')?.addEventListener('click', () => {
      const val = inputCustomHost?.value.trim();
      if (val) {
        localStorage.setItem('novahacks_custom_host', val);
        if (activeQRRoomId) {
          const room = getRoomById(activeQRRoomId);
          if (room) renderQRContent(room);
        }
      }
    });

    document.getElementById('btn-reset-custom-host')?.addEventListener('click', () => {
      localStorage.removeItem('novahacks_custom_host');
      if (inputCustomHost) inputCustomHost.value = '';
      if (activeQRRoomId) {
        const room = getRoomById(activeQRRoomId);
        if (room) renderQRContent(room);
      }
    });

    // Figma Working Prototype (38:1269 & 38:1305) Action Bar & Speech Tools
    // 1. Export Notes
    document.getElementById('btn-room-export')?.addEventListener('click', () => {
      if (currentActiveRoomId) {
        exportChatNotes(currentActiveRoomId);
      }
    });

    // 2. Share Information Privacy Modal (Figma 38:1305)
    const privacyModal = document.getElementById('privacy-share-modal-backdrop');
    const choiceYes = document.getElementById('btn-privacy-choice-yes');
    const choiceNo = document.getElementById('btn-privacy-choice-no');
    let pendingPrivacyChoice = true;

    document.getElementById('btn-room-share-info')?.addEventListener('click', () => {
      if (!currentActiveRoomId) return;
      pendingPrivacyChoice = roomPrivacySettings[currentActiveRoomId] !== false;
      choiceYes?.classList.toggle('active', pendingPrivacyChoice);
      choiceNo?.classList.toggle('active', !pendingPrivacyChoice);
      privacyModal?.classList.add('open');
      privacyModal?.setAttribute('aria-hidden', 'false');
    });

    choiceYes?.addEventListener('click', () => {
      pendingPrivacyChoice = true;
      choiceYes.classList.add('active');
      choiceNo?.classList.remove('active');
    });

    choiceNo?.addEventListener('click', () => {
      pendingPrivacyChoice = false;
      choiceNo.classList.add('active');
      choiceYes?.classList.remove('active');
    });

    document.getElementById('btn-close-privacy-modal')?.addEventListener('click', () => {
      privacyModal?.classList.remove('open');
      privacyModal?.setAttribute('aria-hidden', 'true');
    });

    document.getElementById('btn-confirm-privacy-choice')?.addEventListener('click', () => {
      if (currentActiveRoomId) {
        roomPrivacySettings[currentActiveRoomId] = pendingPrivacyChoice;
        const badge = document.getElementById('room-privacy-status-indicator');
        if (badge) {
          badge.textContent = pendingPrivacyChoice ? '🔒 Privacy: Shared' : '🕶️ Privacy: Anonymous';
        }
      }
      privacyModal?.classList.remove('open');
      privacyModal?.setAttribute('aria-hidden', 'true');
    });

    // 3. Text-to-Speech Toggle (Figma 30:891 volume_up)
    const ttsBtn = document.getElementById('btn-tts-toggle');
    ttsBtn?.addEventListener('click', () => {
      ttsEnabled = !ttsEnabled;
      ttsBtn.classList.toggle('active', ttsEnabled);
      if (ttsEnabled) {
        speakText('Text-to-speech auto readout active');
      } else {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      }
    });

    // 4. Voice Dictation via Web Speech API (Figma 30:897 mic)
    setupSpeechRecognition('chat-input', 'btn-mic-input');
    setupSpeechRecognition('login-input-name', 'btn-login-name-mic');
    setupSpeechRecognition('login-input-pronouns', 'btn-login-pronouns-mic');

    // 5. Figma 48:268 Pronouns Combobox Dropdown Logic
    const pronounsBox = document.getElementById('login-pronouns-combobox');
    const pronounsInput = document.getElementById('login-input-pronouns');
    const pronounsToggle = document.getElementById('btn-login-pronouns-toggle');
    const pronounsOptions = document.querySelectorAll('#login-pronouns-menu .combobox-option');

    const toggleCombobox = (openState) => {
      if (openState === undefined) {
        pronounsBox?.classList.toggle('open');
      } else if (openState) {
        pronounsBox?.classList.add('open');
      } else {
        pronounsBox?.classList.remove('open');
      }
    };

    pronounsToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCombobox();
    });

    pronounsInput?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCombobox(true);
    });

    pronounsOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = opt.getAttribute('data-value');
        if (pronounsInput) pronounsInput.value = val;
        pronounsOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        toggleCombobox(false);
      });
    });

    document.addEventListener('click', (e) => {
      if (pronounsBox && !pronounsBox.contains(e.target)) {
        toggleCombobox(false);
      }
    });

    // Figma Frame 1 Action Bar: "Add Users", "Remove User", "Delete Chat" (20:53)
    document.getElementById('btn-room-add-users')?.addEventListener('click', () => {
      if (currentActiveRoomId) {
        showQRModal(currentActiveRoomId);
      }
    });

    document.getElementById('btn-room-remove-user')?.addEventListener('click', () => {
      const room = getRoomById(currentActiveRoomId);
      if (room && room.participants.length > 1) {
        const removed = room.participants.pop();
        room.messages.push({
          id: `sys-${Date.now()}`,
          sender: 'QuickChat System',
          senderInitial: 'Q',
          isSystem: true,
          text: `Participant ${removed.name} left the room.`,
          timestamp: Date.now()
        });
        saveAllRooms(getAllRooms().map(r => (r.roomId === room.roomId ? room : r)));
        renderMessageStream(room.messages);
        renderRoomAvatarCluster(room.participants);
        broadcastMessage({ type: 'PARTICIPANT_JOINED', roomId: room.roomId });
      } else {
        alert('You are the only participant in this room right now.');
      }
    });

    // Delete Chat Confirmation
    const deleteModal = document.getElementById('delete-confirm-modal-backdrop');
    document.getElementById('btn-room-delete-chat')?.addEventListener('click', () => {
      deleteModal?.classList.add('open');
      deleteModal?.setAttribute('aria-hidden', 'false');
    });

    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => {
      deleteModal?.classList.remove('open');
      deleteModal?.setAttribute('aria-hidden', 'true');
    });

    document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
      deleteModal?.classList.remove('open');
      deleteModal?.setAttribute('aria-hidden', 'true');
      if (currentActiveRoomId) {
        const roomId = currentActiveRoomId;
        const wasGuest = isGuestInCurrentRoom;
        deleteRoom(roomId, 'user_deleted');
        currentActiveRoomId = null;

        if (wasGuest) {
          showGuestConversionModal();
        } else {
          switchView('home');
        }
      }
    });

    // Message Composer Form (Figma Text Bar 16:153)
    const composerForm = document.getElementById('chat-composer-form');
    const chatInput = document.getElementById('chat-input');

    composerForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (chatInput && chatInput.value.trim()) {
        sendChatMessage(chatInput.value);
        chatInput.value = '';
      }
    });

    // Suggestion chips
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        if (text) sendChatMessage(text);
      });
    });

    // Post-Chat Guest Conversion Form
    const conversionForm = document.getElementById('guest-conversion-form');
    conversionForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const newProfile = {
        avatar: 'assets/avatar.jpg',
        fullName: document.getElementById('convert-name')?.value || 'Student',
        pronouns: document.getElementById('convert-pronouns')?.value || 'they / them',
        username: (document.getElementById('convert-name')?.value || 'student').toLowerCase().replace(/\s+/g, '_'),
        course: document.getElementById('convert-course')?.value || 'BUSM 1872',
        campus: document.getElementById('convert-campus')?.value || 'Trafalgar Campus (Oakville)',
        faculty: 'Faculty of Animation, Arts & Design (FAAD)',
        program: 'Interaction Design',
        academicYear: 'Year 1 • Class of 2029',
        bio: 'Created profile after an awesome QuickChat at NovaHacks! Excited to collaborate.',
        tags: ['QuickChat', 'NovaHacks', 'BUSM 1872'],
        isGuest: false
      };

      saveProfileData(newProfile);
      renderProfile(newProfile);
      document.getElementById('guest-conversion-modal-backdrop')?.classList.remove('open');
      isGuestInCurrentRoom = false;
      switchView('profile');
      alert(`Welcome to QuickChat, ${newProfile.fullName}! Your student profile has been created.`);
    });

    document.getElementById('btn-skip-conversion')?.addEventListener('click', () => {
      document.getElementById('guest-conversion-modal-backdrop')?.classList.remove('open');
      switchView('home');
    });

    // Profile Edit Modal Handlers (Preserved)
    const profileEditModal = document.getElementById('modal-backdrop');
    const openProfileEdit = () => {
      const p = getProfileData();
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
      };
      setVal('input-name', p.fullName);
      setVal('input-pronouns', p.pronouns);
      setVal('input-username', (p.username || '').replace('@', ''));
      setVal('input-course', p.course || 'BUSM 1872 & IXD');
      setVal('input-campus', p.campus);
      setVal('input-faculty', p.faculty);
      setVal('input-program', p.program);
      setVal('input-year', p.academicYear);
      setVal('input-bio', p.bio);
      setVal('input-tags', Array.isArray(p.tags) ? p.tags.join(', ') : '');

      profileEditModal?.classList.add('open');
    };

    document.getElementById('btn-edit-mobile')?.addEventListener('click', openProfileEdit);
    document.getElementById('btn-edit-desktop')?.addEventListener('click', openProfileEdit);
    document.getElementById('btn-close-drawer')?.addEventListener('click', () => profileEditModal?.classList.remove('open'));
    document.getElementById('btn-cancel-edit')?.addEventListener('click', () => profileEditModal?.classList.remove('open'));

    document.getElementById('profile-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const tagsInput = document.getElementById('input-tags')?.value || '';
      const p = getProfileData();
      const updated = {
        ...p,
        fullName: document.getElementById('input-name')?.value.trim() || p.fullName,
        pronouns: document.getElementById('input-pronouns')?.value.trim() || 'they / them',
        username: document.getElementById('input-username')?.value.trim().replace('@', '') || p.username,
        course: document.getElementById('input-course')?.value.trim() || p.course,
        campus: document.getElementById('input-campus')?.value.trim() || p.campus,
        faculty: document.getElementById('input-faculty')?.value.trim() || p.faculty,
        program: document.getElementById('input-program')?.value.trim() || p.program,
        academicYear: document.getElementById('input-year')?.value.trim() || p.academicYear,
        bio: document.getElementById('input-bio')?.value.trim() || p.bio,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      };
      saveProfileData(updated);
      renderProfile(updated);
      profileEditModal?.classList.remove('open');
    });

    // Avatar upload handler
    document.getElementById('avatar-input')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const p = getProfileData();
            p.avatar = event.target.result;
            saveProfileData(p);
            renderProfile(p);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    // Filter Tabs (Active vs Past 30 days)
    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilterTab = btn.getAttribute('data-filter');
        renderRoomsList();
      });
    });

    // URL Query Parameter Handling for Guest Join (?room=XYZ)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    if (roomParam) {
      let targetRoom = getRoomById(roomParam);

      // Dynamic Room Auto-Hydration for scanned guest devices
      if (!targetRoom) {
        const topic = urlParams.get('topic') || roomParam.split('-')[0] || 'BUSM 1872';
        const host = urlParams.get('host') || 'Maya Patel';
        const expires = parseInt(urlParams.get('expires')) || (Date.now() + 24 * 3600000);

        targetRoom = {
          roomId: roomParam,
          courseTopic: topic,
          hostName: host,
          createdAt: Date.now(),
          expiresAt: expires,
          status: 'active',
          unreadCount: 0,
          participants: [
            { id: 'p-host-initial', name: host, initial: (host || 'H').charAt(0).toUpperCase(), color: 'circle-color-navy', isHost: true }
          ],
          messages: [
            {
              id: `sys-${Date.now()}`,
              sender: 'QuickChat System',
              senderInitial: 'Q',
              isSystem: true,
              text: `⚡ Room ${roomParam} connected for [${topic}]. You joined as an anonymous guest! Auto-deletes in 24 hours.`,
              timestamp: Date.now()
            }
          ]
        };
        const allRooms = getAllRooms();
        allRooms.unshift(targetRoom);
        saveAllRooms(allRooms);
      }

      if (targetRoom) {
        const guestJoinModal = document.getElementById('guest-join-modal-backdrop');
        const guestHostName = document.getElementById('guest-host-name');
        const guestTopic = document.getElementById('guest-invite-topic');
        const guestJoinTitle = document.getElementById('guest-join-title');

        if (guestHostName) guestHostName.textContent = targetRoom.hostName;
        if (guestTopic) guestTopic.textContent = targetRoom.courseTopic || 'BUSM 1872';
        if (guestJoinTitle) guestJoinTitle.textContent = `Join ${targetRoom.courseTopic || 'QuickChat'}`;

        guestJoinModal?.classList.add('open');

        document.getElementById('btn-confirm-guest-join')?.addEventListener('click', () => {
          const nickInput = document.getElementById('input-guest-nickname');
          const guestNickname = nickInput?.value.trim() || `Guest #${Math.floor(10 + Math.random() * 90)}`;
          localStorage.setItem(GUEST_ID_KEY, guestNickname);

          const guestInitial = guestNickname.charAt(0).toUpperCase();
          const color = INITIAL_COLORS[(targetRoom.participants || []).length % INITIAL_COLORS.length];

          targetRoom.participants.push({
            id: `guest-${Date.now()}`,
            name: guestNickname,
            initial: guestInitial,
            color: color,
            isHost: false
          });

          targetRoom.messages.push({
            id: `sys-${Date.now()}`,
            sender: 'QuickChat System',
            senderInitial: 'Q',
            isSystem: true,
            text: `👋 ${guestNickname} joined the conversation.`,
            timestamp: Date.now()
          });

          const rooms = getAllRooms().map(r => (r.roomId === targetRoom.roomId ? targetRoom : r));
          saveAllRooms(rooms);

          broadcastMessage({
            type: 'PARTICIPANT_JOINED',
            roomId: targetRoom.roomId,
            guestNickname: guestNickname
          });

          guestJoinModal?.classList.remove('open');
          openChatRoom(targetRoom.roomId, true);
        });
      } else {
        alert(`Room "${roomParam}" was not found or has expired.`);
        switchView('home');
      }
    } else {
      // If user hasn't visited before, show Figma Login view (with Skip option)
      const hasOnboarded = localStorage.getItem(ONBOARDED_KEY);
      if (!hasOnboarded) {
        switchView('login');
      } else {
        switchView('home');
      }
    }

    renderRoomsList();
    updateNavBadges();
  });
})();
