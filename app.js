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

  function getProfileData() {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Error reading profile.', e);
    }
    return DEFAULT_PROFILE;
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
          { id: 'p3', name: 'Chris Chen', initial: 'C', color: 'circle-color-magenta', isHost: false },
          { id: 'p4', name: 'Alex Rivera', initial: 'A', color: 'circle-color-lime', isHost: false }
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
      }
    ];
  }

  function getAllRooms() {
    try {
      const stored = localStorage.getItem(ROOMS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading rooms from storage.', e);
    }
    const seed = getInitialSeedRooms();
    saveAllRooms(seed);
    return seed;
  }

  function saveAllRooms(rooms) {
    try {
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
      updateNavBadges();
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
    const remaining = rooms.filter(r => r.expiresAt > now);
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
    const viewOnboarding = document.getElementById('view-onboarding');
    const viewHome = document.getElementById('view-home');
    const viewRoom = document.getElementById('view-room');
    const viewProfile = document.getElementById('view-profile');

    const pageTitle = document.getElementById('page-title');
    const btnTopGenerateQr = document.getElementById('btn-top-generate-qr');
    const btnEditDesktop = document.getElementById('btn-edit-desktop');

    // Hide all views
    if (viewOnboarding) viewOnboarding.style.display = 'none';
    if (viewHome) viewHome.style.display = 'none';
    if (viewRoom) viewRoom.style.display = 'none';
    if (viewProfile) viewProfile.style.display = 'none';

    // Top action buttons
    if (btnTopGenerateQr) btnTopGenerateQr.style.display = 'none';
    if (btnEditDesktop) btnEditDesktop.style.display = 'none';

    // Reset active nav items
    const allNavButtons = document.querySelectorAll('.dock-tab, .sidebar-item');
    allNavButtons.forEach(b => b.classList.remove('active'));

    if (viewName === 'onboarding') {
      if (viewOnboarding) viewOnboarding.style.display = 'flex';
      if (pageTitle) pageTitle.textContent = 'Welcome to QuickChat';
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

  function updateNavBadges() {
    const rooms = getAllRooms();
    const activeCount = rooms.length;
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
      const totalUnread = rooms.reduce((acc, r) => acc + (r.unreadCount || 0), 0);
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

  function renderMessageStream(messages) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    container.innerHTML = '';

    messages.forEach(msg => {
      if (msg.isSystem) {
        const sysDiv = document.createElement('div');
        sysDiv.className = 'system-notice-bubble';
        sysDiv.textContent = msg.text;
        container.appendChild(sysDiv);
        return;
      }

      const row = document.createElement('div');
      const isMine = isGuestInCurrentRoom ? !msg.isHost : msg.isHost;
      row.className = `message-row ${isMine ? 'msg-host' : 'msg-guest'}`;

      const senderCluster = document.createElement('div');
      senderCluster.className = 'message-sender-cluster';

      const miniInitial = document.createElement('div');
      miniInitial.className = `mini-initial-circle ${isMine ? 'circle-color-navy' : 'circle-color-magenta'}`;
      miniInitial.textContent = msg.senderInitial || (msg.sender || 'U').charAt(0).toUpperCase();

      const senderSpan = document.createElement('span');
      senderSpan.className = 'message-sender';
      senderSpan.textContent = isMine ? 'You' : msg.sender;

      senderCluster.appendChild(miniInitial);
      senderCluster.appendChild(senderSpan);

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = msg.text;

      const timeSpan = document.createElement('span');
      timeSpan.className = 'message-time';
      const msgDate = new Date(msg.timestamp);
      timeSpan.textContent = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      row.appendChild(senderCluster);
      row.appendChild(bubble);
      row.appendChild(timeSpan);
      container.appendChild(row);
    });

    container.scrollTop = container.scrollHeight;
  }

  function sendChatMessage(text) {
    if (!currentActiveRoomId || !text.trim()) return;
    const room = getRoomById(currentActiveRoomId);
    if (!room) return;

    const profile = getProfileData();
    const guestIdentity = localStorage.getItem(GUEST_ID_KEY) || 'Nova Guest';
    const senderName = isGuestInCurrentRoom ? guestIdentity : profile.fullName;
    const senderInitial = senderName.charAt(0).toUpperCase();

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: senderName,
      senderInitial: senderInitial,
      isHost: !isGuestInCurrentRoom,
      text: text.trim(),
      timestamp: Date.now()
    };

    room.messages.push(newMessage);
    const allRooms = getAllRooms().map(r => (r.roomId === room.roomId ? room : r));
    saveAllRooms(allRooms);

    renderMessageStream(room.messages);

    broadcastMessage({
      type: 'NEW_MESSAGE',
      roomId: room.roomId,
      message: newMessage
    });
  }

  // --------------------------------------------------------------------------
  // 6. Rooms List Hub Rendering (Figma 16:74 & 30:593)
  // --------------------------------------------------------------------------
  function renderRoomsList() {
    const listContainer = document.getElementById('home-rooms-list');
    if (!listContainer) return;

    purgeExpiredRooms();
    const rooms = getAllRooms();
    updateNavBadges();

    if (rooms.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-rooms-state">
          <div class="empty-state-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h4>No Active QuickChat Rooms</h4>
          <p>Tap <strong>"Generate QR"</strong> above to launch an instant ephemeral chat for your course, group project, or campus meet!</p>
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
  // 7. QR Modal Controller
  // --------------------------------------------------------------------------
  function showQRModal(roomId) {
    const room = getRoomById(roomId);
    if (!room) return;

    const modal = document.getElementById('qr-modal-backdrop');
    const codeDisplay = document.getElementById('qr-room-code-display');
    const urlInput = document.getElementById('qr-room-url-input');
    const topicBadge = document.getElementById('qr-topic-badge');

    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

    if (codeDisplay) codeDisplay.textContent = roomId;
    if (urlInput) urlInput.value = shareUrl;
    if (topicBadge) topicBadge.textContent = room.courseTopic || 'BUSM 1872';

    generateQRCode('qr-code-element', shareUrl);

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
    const currentProfile = getProfileData();
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

    // Onboarding Form & Skip Handler (Figma 16:83)
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
      const targetRoom = getRoomById(roomParam);
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
      // If user hasn't visited before, show onboarding view (with Skip option)
      const hasOnboarded = localStorage.getItem(ONBOARDED_KEY);
      if (!hasOnboarded) {
        switchView('onboarding');
      } else {
        switchView('home');
      }
    }

    renderRoomsList();
    updateNavBadges();
  });
})();
