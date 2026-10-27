// NovaHacks QuickChat - Dynamic Profile Architecture & Data Store
(function () {
  'use strict';

  // 1. Initial State Model (Default fallback if localStorage is empty)
  const DEFAULT_PROFILE = {
    avatar: 'assets/avatar.jpg',
    fullName: 'Maya Patel',
    pronouns: 'she / her',
    username: 'maya_sheridan',
    campus: 'Trafalgar Campus (Oakville)',
    faculty: 'Faculty of Animation, Arts & Design (FAAD)',
    program: 'Honours Bachelor of Interaction Design (IXD)',
    academicYear: 'Year 3 • Class of 2027',
    bio: 'Designing playful, accessible interfaces for student collaboration. Currently building prototypes for the Nova Design Hackathon! 🚀',
    tags: ['UI/UX Design', 'Design Systems', 'NovaHacks', 'Figma MCP'],
    stats: {
      connections: 128,
      studyGroups: 4
    },
    isOnline: true
  };

  const STORAGE_KEY = 'novahacks_quickchat_user_profile';

  // 2. Data Store Helper Functions (Get & Save)
  function getProfileData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using memory model.', e);
    }
    return DEFAULT_PROFILE;
  }

  function saveProfileData(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Could not save to localStorage.', e);
    }
  }

  // 3. Dynamic Renderer: Updates all UI elements from state object
  function renderProfile(profile) {
    // Dynamic text bindings
    const bindText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    bindText('display-name', profile.fullName);
    bindText('display-pronouns', profile.pronouns);
    bindText('display-username', `@${profile.username.replace('@', '')}`);
    bindText('display-campus', profile.campus);
    bindText('display-faculty', profile.faculty);
    bindText('display-program', profile.program);
    bindText('display-bio', profile.bio);

    const yearEl = document.getElementById('display-year');
    if (yearEl) yearEl.textContent = profile.academicYear;

    const statsEl = document.getElementById('display-stats');
    if (statsEl && profile.stats) {
      statsEl.textContent = `${profile.stats.connections} Student Connections • ${profile.stats.studyGroups} Active Study Groups`;
    }

    // Avatar
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl && profile.avatar) {
      avatarEl.src = profile.avatar;
    }

    // Dynamic tags list
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

  // 4. Form Binding Helper: Populates edit form from current data
  function populateForm(profile) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('input-name', profile.fullName);
    setVal('input-pronouns', profile.pronouns);
    setVal('input-username', profile.username.replace('@', ''));
    setVal('input-campus', profile.campus);
    setVal('input-faculty', profile.faculty);
    setVal('input-program', profile.program);
    setVal('input-year', profile.academicYear);
    setVal('input-bio', profile.bio);
    setVal('input-tags', Array.isArray(profile.tags) ? profile.tags.join(', ') : '');
  }

  // 5. Initialize application
  document.addEventListener('DOMContentLoaded', () => {
    let currentProfile = getProfileData();
    renderProfile(currentProfile);

    // Live clock for mobile view
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const timeEl = document.getElementById('status-time');
      if (timeEl) {
        timeEl.textContent = `${hours % 12 || 12}:${minutes}`;
      }
    };
    updateTime();
    setInterval(updateTime, 30000);

    // Modal elements
    const modalBackdrop = document.getElementById('modal-backdrop');
    const btnEditMobile = document.getElementById('btn-edit-mobile');
    const btnEditDesktop = document.getElementById('btn-edit-desktop');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const profileForm = document.getElementById('profile-form');
    const avatarInput = document.getElementById('avatar-input');
    const btnShare = document.getElementById('btn-share-profile');

    const openModal = () => {
      populateForm(currentProfile);
      modalBackdrop.classList.add('open');
      modalBackdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
      modalBackdrop.classList.remove('open');
      modalBackdrop.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    btnEditMobile?.addEventListener('click', openModal);
    btnEditDesktop?.addEventListener('click', openModal);
    btnCloseDrawer?.addEventListener('click', closeModal);
    btnCancelEdit?.addEventListener('click', closeModal);

    modalBackdrop?.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) {
        closeModal();
      }
    });

    // Form submit updates data state, re-renders, and saves
    profileForm?.addEventListener('submit', (e) => {
      e.preventDefault();

      const tagsInput = document.getElementById('input-tags')?.value || '';
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      currentProfile = {
        ...currentProfile,
        fullName: document.getElementById('input-name')?.value.trim() || currentProfile.fullName,
        pronouns: document.getElementById('input-pronouns')?.value.trim() || 'they / them',
        username: document.getElementById('input-username')?.value.trim().replace('@', '') || currentProfile.username,
        campus: document.getElementById('input-campus')?.value.trim() || currentProfile.campus,
        faculty: document.getElementById('input-faculty')?.value.trim() || currentProfile.faculty,
        program: document.getElementById('input-program')?.value.trim() || currentProfile.program,
        academicYear: document.getElementById('input-year')?.value.trim() || currentProfile.academicYear,
        bio: document.getElementById('input-bio')?.value.trim() || currentProfile.bio,
        tags: parsedTags.length > 0 ? parsedTags : currentProfile.tags
      };

      saveProfileData(currentProfile);
      renderProfile(currentProfile);
      closeModal();
    });

    // Profile photo upload preview & base64 persistence
    avatarInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            currentProfile.avatar = event.target.result;
            saveProfileData(currentProfile);
            renderProfile(currentProfile);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    // Native Share / Clipboard Fallback
    btnShare?.addEventListener('click', async () => {
      const shareData = {
        title: `${currentProfile.fullName} - QuickChat Profile`,
        text: `${currentProfile.fullName} (${currentProfile.pronouns}) • ${currentProfile.program} at ${currentProfile.campus}`,
        url: window.location.href,
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          console.log('Share dismissed');
        }
      } else {
        navigator.clipboard?.writeText(window.location.href);
        alert('Profile link copied to clipboard!');
      }
    });

    // Navigation tab active state toggling
    const allNavButtons = document.querySelectorAll('.dock-tab, .sidebar-item');
    allNavButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        allNavButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });
})();
