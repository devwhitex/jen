// Server Maintainer Bot Dashboard Client Logic

let currentPasscode = localStorage.getItem('dashboard_passcode') || '';
let currentGuildId = '';
let autoRepliesCache = [];
let telemetryInterval = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupMobileToggle();

  if (!currentPasscode) {
    document.getElementById('authModal').classList.remove('hidden');
  } else {
    document.getElementById('authModal').classList.add('hidden');
    initDashboard();
  }
});

// Authentication
async function handleLogin(e) {
  e.preventDefault();
  const input = document.getElementById('passcodeInput').value.trim();
  const errorEl = document.getElementById('authError');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: input })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      currentPasscode = input;
      localStorage.setItem('dashboard_passcode', input);
      document.getElementById('authModal').classList.add('hidden');
      errorEl.classList.add('hidden');
      initDashboard();
      showToast('Welcome to Control Center!', 'success');
    } else {
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Connection error. Make sure bot is running.';
    errorEl.classList.remove('hidden');
  }
}

function handleLogout() {
  localStorage.removeItem('dashboard_passcode');
  currentPasscode = '';
  document.getElementById('authModal').classList.remove('hidden');
  if (telemetryInterval) clearInterval(telemetryInterval);
  showToast('Dashboard locked.', 'info');
}

// Navigation Tabs
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  const activeBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  const activePane = document.getElementById(`tab-${tabId}`);

  if (activeBtn) activeBtn.classList.add('active');
  if (activePane) activePane.classList.add('active');

  // Close mobile sidebar if open
  document.querySelector('.sidebar').classList.remove('open');
}

function setupMobileToggle() {
  const toggle = document.getElementById('mobileMenuBtn');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
    });
  }
}

// Authenticated Fetch Helper
async function apiFetch(url, options = {}) {
  options.headers = options.headers || {};
  options.headers['Content-Type'] = 'application/json';
  options.headers['x-admin-passcode'] = currentPasscode;

  const res = await fetch(url, options);
  if (res.status === 401) {
    handleLogout();
    throw new Error('Unauthorized');
  }
  return res;
}

// Initialize Dashboard Data
async function initDashboard() {
  await fetchDashboardData();
  await loadAutoReplies();
  await loadAntiNukeData();
  await loadTickets();
  await loadVoiceSettings();
  updateEmbedPreview();

  if (telemetryInterval) clearInterval(telemetryInterval);
  telemetryInterval = setInterval(fetchDashboardData, 5000);
}

// Live Telemetry & Bot Data
async function fetchDashboardData() {
  try {
    const res = await apiFetch('/api/stats');
    const data = await res.json();

    if (!data || !data.bot) return;

    // Update Topbar & Brand
    document.getElementById('brandName').textContent = data.bot.username || 'Maintainer Bot';
    document.getElementById('brandTag').textContent = data.bot.tag || 'Jen#4058';
    if (data.bot.avatar) {
      document.getElementById('brandAvatar').src = data.bot.avatar;
      document.getElementById('previewBotAvatar').src = data.bot.avatar;
    }
    document.getElementById('previewBotName').textContent = data.bot.username || 'Jen';
    document.getElementById('infoBotId').textContent = data.bot.id || '1562740863631622174';

    // Metrics
    document.getElementById('pingValue').textContent = `${data.ping || 0} ms`;
    document.getElementById('statPing').textContent = `${data.ping || 0} ms`;
    document.getElementById('uptimeValue').textContent = data.uptime || '00:00:00';
    document.getElementById('statGuilds').textContent = data.guildsCount || 0;
    document.getElementById('statMembers').textContent = data.totalMembers || 0;
    document.getElementById('statCommands').textContent = data.commandsCount || 49;

    // Maintenance Mode Toggle
    const mSwitch = document.getElementById('maintenanceSwitch');
    if (mSwitch) mSwitch.checked = !!data.maintenanceActive;
    if (data.maintenanceMessage) {
      document.getElementById('maintenanceMsg').value = data.maintenanceMessage;
    }

    // Populate Guild Selector & Channels
    if (data.guilds && data.guilds.length > 0) {
      populateGuildSelector(data.guilds);
    }

    // Music Telemetry
    if (data.music) {
      updateMusicUI(data.music);
    }
  } catch (err) {
    console.error('Failed to fetch dashboard stats:', err);
  }
}

function populateGuildSelector(guilds) {
  const gSelect = document.getElementById('guildSelect');
  const annSelect = document.getElementById('annChannelSelect');
  const cleanSelect = document.getElementById('cleanerChannelSelect');

  const prevGuild = gSelect.value || guilds[0].id;
  currentGuildId = prevGuild;

  gSelect.innerHTML = guilds.map(g => `<option value="${g.id}" ${g.id === prevGuild ? 'selected' : ''}>${escapeHtml(g.name)} (${g.memberCount} members)</option>`).join('');

  const activeGuild = guilds.find(g => g.id === currentGuildId) || guilds[0];
  if (activeGuild && activeGuild.textChannels) {
    const channelOptions = activeGuild.textChannels.map(c => `<option value="${c.id}"># ${escapeHtml(c.name)}</option>`).join('');
    
    const prevAnn = annSelect.value;
    const prevClean = cleanSelect.value;

    annSelect.innerHTML = channelOptions;
    cleanSelect.innerHTML = channelOptions;

    if (prevAnn) annSelect.value = prevAnn;
    if (prevClean) cleanSelect.value = prevClean;

    const voiceLogSelect = document.getElementById('voiceLogChannelSelect');
    if (voiceLogSelect) {
      const prevVoiceLog = voiceLogSelect.value;
      voiceLogSelect.innerHTML = '<option value="">-- None (Only if using log channel mode) --</option>' + channelOptions;
      if (prevVoiceLog) voiceLogSelect.value = prevVoiceLog;
    }
  }

  if (activeGuild && activeGuild.voiceChannels) {
    const vSelect = document.getElementById('voice247ChannelSelect');
    if (vSelect) {
      const prevV = vSelect.value;
      vSelect.innerHTML = '<option value="">-- Choose a Voice Channel --</option>' + 
        activeGuild.voiceChannels.map(vc => `<option value="${vc.id}">🔊 ${escapeHtml(vc.name)}</option>`).join('');
      if (prevV) vSelect.value = prevV;
    }
  }
}

function handleGuildChange() {
  currentGuildId = document.getElementById('guildSelect').value;
  fetchDashboardData();
  loadVoiceSettings();
}

// ----------------------------------------------------
// ANNOUNCEMENTS
// ----------------------------------------------------
function updateEmbedPreview() {
  const title = document.getElementById('annTitle').value || 'Major Server Update v2.0';
  const badge = document.getElementById('annBadge').value;
  const desc = document.getElementById('annDesc').value || 'Write your announcement content here to preview how it looks inside Discord.';
  const color = document.getElementById('annColor').value;
  const ping = document.getElementById('annPing').value;
  const imgUrl = document.getElementById('annImage').value.trim();

  document.getElementById('previewTitle').textContent = title;
  document.getElementById('previewBadge').textContent = badge;
  document.getElementById('previewDesc').textContent = desc;

  const embed = document.getElementById('previewEmbed');
  embed.style.borderLeftColor = color;

  const pingLine = document.getElementById('previewPingMention');
  if (ping === 'everyone') {
    pingLine.textContent = '@everyone';
    pingLine.classList.remove('hidden');
  } else if (ping === 'here') {
    pingLine.textContent = '@here';
    pingLine.classList.remove('hidden');
  } else {
    pingLine.classList.add('hidden');
  }

  const previewImg = document.getElementById('previewImage');
  if (imgUrl) {
    previewImg.src = imgUrl;
    previewImg.classList.remove('hidden');
  } else {
    previewImg.classList.add('hidden');
  }
}

function syncHexColor(hex) {
  if (/^#[0-9A-F]{6}$/i.test(hex)) {
    document.getElementById('annColor').value = hex;
    updateEmbedPreview();
  }
}

async function handleSendAnnouncement(e) {
  e.preventDefault();
  const btn = document.getElementById('btnPublishAnn');
  btn.disabled = true;
  btn.textContent = 'Publishing...';

  const payload = {
    guildId: currentGuildId,
    channelId: document.getElementById('annChannelSelect').value,
    title: document.getElementById('annTitle').value,
    badge: document.getElementById('annBadge').value,
    description: document.getElementById('annDesc').value,
    imageUrl: document.getElementById('annImage').value.trim(),
    color: document.getElementById('annColor').value,
    ping: document.getElementById('annPing').value
  };

  try {
    const res = await apiFetch('/api/announce', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast('Announcement posted to Discord successfully!', 'success');
      document.getElementById('annTitle').value = '';
      document.getElementById('annDesc').value = '';
      document.getElementById('annImage').value = '';
      updateEmbedPreview();
    } else {
      showToast(data.error || 'Failed to post announcement', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>🚀 Publish to Discord Channel</span>';
  }
}

// ----------------------------------------------------
// AUTO-REPLIES
// ----------------------------------------------------
async function loadAutoReplies() {
  try {
    const res = await apiFetch('/api/autoreplies');
    const data = await res.json();
    autoRepliesCache = data.triggers || [];
    renderAutoReplies(autoRepliesCache);
    document.getElementById('arCount').textContent = autoRepliesCache.length;
  } catch (err) {
    console.error('Failed to load auto-replies:', err);
  }
}

function renderAutoReplies(list) {
  const tbody = document.getElementById('arTableBody');
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No custom auto-replies configured yet.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.trigger_text)}</strong></td>
      <td><span class="badge-pill ${item.match_type}">${item.match_type}</span></td>
      <td>${escapeHtml(item.response_text)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="handleDeleteAutoReply(${item.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function filterAutoReplies(query) {
  const q = query.toLowerCase().trim();
  if (!q) return renderAutoReplies(autoRepliesCache);
  const filtered = autoRepliesCache.filter(item => 
    item.trigger_text.toLowerCase().includes(q) || 
    item.response_text.toLowerCase().includes(q)
  );
  renderAutoReplies(filtered);
}

async function handleCreateAutoReply(e) {
  e.preventDefault();
  const trigger = document.getElementById('arTrigger').value.trim();
  const matchType = document.getElementById('arMatchType').value;
  const response = document.getElementById('arResponse').value.trim();

  try {
    const res = await apiFetch('/api/autoreplies', {
      method: 'POST',
      body: JSON.stringify({ trigger, matchType, response, guildId: currentGuildId })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast(`Trigger "${trigger}" created!`, 'success');
      document.getElementById('arTrigger').value = '';
      document.getElementById('arResponse').value = '';
      await loadAutoReplies();
    } else {
      showToast(data.error || 'Failed to create trigger', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteAutoReply(id) {
  if (!confirm('Are you sure you want to delete this auto-reply trigger?')) return;
  try {
    const res = await apiFetch(`/api/autoreplies/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Trigger deleted.', 'success');
      await loadAutoReplies();
    } else {
      showToast('Failed to delete trigger.', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// CHAT CLEANER & MODERATION
// ----------------------------------------------------
async function handlePurge(amount) {
  const channelId = document.getElementById('cleanerChannelSelect').value;
  if (!channelId) return showToast('Please select a target channel.', 'error');

  if (!confirm(`Are you sure you want to bulk delete ${amount} messages in this channel?`)) return;

  try {
    const res = await apiFetch('/api/clean/purge', {
      method: 'POST',
      body: JSON.stringify({ channelId, amount })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Successfully deleted ${data.deleted} messages!`, 'success');
    } else {
      showToast(data.error || 'Purge failed.', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handlePurgeFilter(filterType) {
  const channelId = document.getElementById('cleanerChannelSelect').value;
  if (!channelId) return showToast('Please select a target channel.', 'error');

  try {
    const res = await apiFetch('/api/clean/filter', {
      method: 'POST',
      body: JSON.stringify({ channelId, filterType, amount: 50 })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Purged ${data.deleted} ${filterType} messages!`, 'success');
    } else {
      showToast(data.error || 'Filter purge failed.', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateSlowmodeLabel(val) {
  const label = document.getElementById('slowmodeLabel');
  label.textContent = val === '0' ? 'Off (0s)' : `${val}s delay`;
}

async function handleApplySlowmode() {
  const channelId = document.getElementById('cleanerChannelSelect').value;
  const seconds = parseInt(document.getElementById('slowmodeSlider').value, 10);
  if (!channelId) return showToast('Please select a target channel.', 'error');

  try {
    const res = await apiFetch('/api/clean/slowmode', {
      method: 'POST',
      body: JSON.stringify({ channelId, seconds })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Slowmode set to ${seconds}s for channel.`, 'success');
    } else {
      showToast(data.error || 'Failed to update slowmode.', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleChannelLock(isLock) {
  const channelId = document.getElementById('cleanerChannelSelect').value;
  if (!channelId) return showToast('Please select a target channel.', 'error');

  try {
    const res = await apiFetch('/api/clean/lock', {
      method: 'POST',
      body: JSON.stringify({ channelId, lock: isLock })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(isLock ? '🔒 Channel locked successfully!' : '🔓 Channel unlocked!', 'success');
    } else {
      showToast(data.error || 'Lock action failed.', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// MUSIC DECK
// ----------------------------------------------------
function updateMusicUI(music) {
  const statusEl = document.getElementById('playerStatus');
  const titleEl = document.getElementById('playerTitle');
  const channelEl = document.getElementById('playerChannel');

  if (music.isPlaying && music.currentTrack) {
    statusEl.textContent = music.isPaused ? '⏸️ Paused' : '▶️ Now Playing';
    titleEl.textContent = music.currentTrack.title || 'Unknown Track';
    channelEl.textContent = `Connected to Voice Channel: ${music.voiceChannelName || 'Active'}`;
  } else {
    statusEl.textContent = 'Idle • No Song Playing';
    titleEl.textContent = 'Queue is currently empty';
    channelEl.textContent = 'Not connected to a voice channel';
  }
}

async function handleMusicControl(action) {
  try {
    const res = await apiFetch('/api/music/action', {
      method: 'POST',
      body: JSON.stringify({ guildId: currentGuildId, action })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Music action: ${action} executed.`, 'success');
      fetchDashboardData();
    } else {
      showToast(data.error || 'No active music queue in server.', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleVolumeChange(val) {
  document.getElementById('volumeValue').textContent = `${val}%`;
  try {
    await apiFetch('/api/music/volume', {
      method: 'POST',
      body: JSON.stringify({ guildId: currentGuildId, volume: parseInt(val, 10) })
    });
    showToast(`Volume set to ${val}%`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// SERVER SETTINGS & MAINTENANCE
// ----------------------------------------------------
async function handleToggleMaintenance(enabled) {
  try {
    const res = await apiFetch('/api/maintenance/toggle', {
      method: 'POST',
      body: JSON.stringify({ guildId: currentGuildId, enabled })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(enabled ? '⚠️ Maintenance mode activated.' : '✅ Maintenance mode deactivated.', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSaveMaintenanceMsg() {
  const msg = document.getElementById('maintenanceMsg').value.trim();
  try {
    const res = await apiFetch('/api/maintenance/message', {
      method: 'POST',
      body: JSON.stringify({ guildId: currentGuildId, message: msg })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Maintenance notice updated.', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Utility: escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

// ----------------------------------------------------
// ANTI-NUKE DEFENDER
// ----------------------------------------------------
async function loadAntiNukeData() {
  try {
    const res = await apiFetch('/api/antinuke');
    const data = await res.json();
    if (!data) return;

    if (data.settings) {
      const s = data.settings;
      const sw = document.getElementById('antinukeEnabledSwitch');
      if (sw) sw.checked = !!s.enabled;

      const pSelect = document.getElementById('antinukePunishment');
      if (pSelect) pSelect.value = s.punishment || 'ban';

      setSliderValue('limitChannelDelete', 'lblChannelDelete', s.max_channel_deletes || 3);
      setSliderValue('limitChannelCreate', 'lblChannelCreate', s.max_channel_creates || 4);
      setSliderValue('limitBanKick', 'lblBanKick', s.max_ban_kicks || 3);
      setSliderValue('limitRoleDelete', 'lblRoleDelete', s.max_role_deletes || 3);
    }

    renderWhitelist(data.whitelist || []);
    renderAntiNukeLogs(data.logs || []);
  } catch (err) {
    console.error('Failed to load anti-nuke data:', err);
  }
}

function setSliderValue(sliderId, labelId, val) {
  const el = document.getElementById(sliderId);
  const lbl = document.getElementById(labelId);
  if (el) el.value = val;
  if (lbl) lbl.textContent = `${val} max`;
}

function updateLimitLabel(labelId, val) {
  const lbl = document.getElementById(labelId);
  if (lbl) lbl.textContent = `${val} max`;
}

async function handleToggleAntiNuke(enabled) {
  try {
    const res = await apiFetch('/api/antinuke/settings', {
      method: 'POST',
      body: JSON.stringify({ guildId: currentGuildId, enabled })
    });
    if (res.ok) {
      showToast(enabled ? '🛡️ Anti-Nuke Defender activated!' : '⚠️ Anti-Nuke Defender disabled.', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSaveAntiNukeSettings() {
  const payload = {
    guildId: currentGuildId,
    punishment: document.getElementById('antinukePunishment').value,
    max_channel_deletes: document.getElementById('limitChannelDelete').value,
    max_channel_creates: document.getElementById('limitChannelCreate').value,
    max_ban_kicks: document.getElementById('limitBanKick').value,
    max_role_deletes: document.getElementById('limitRoleDelete').value
  };

  try {
    const res = await apiFetch('/api/antinuke/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('Anti-Nuke settings saved!', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderWhitelist(list) {
  const container = document.getElementById('whitelistContainer');
  if (!list || list.length === 0) {
    container.innerHTML = '<span class="text-muted text-sm">No whitelisted users yet. (Server Owner & Bot are always exempt)</span>';
    return;
  }

  container.innerHTML = list.map(item => `
    <span class="whitelist-pill">
      ID: ${escapeHtml(item.user_id)}
      <button class="btn-remove-pill" onclick="handleRemoveWhitelist('${item.user_id}')" title="Remove whitelist">✕</button>
    </span>
  `).join('');
}

async function handleAddWhitelist(e) {
  e.preventDefault();
  const input = document.getElementById('whitelistUserId');
  const userId = input.value.trim();
  if (!userId) return;

  try {
    const res = await apiFetch('/api/antinuke/whitelist', {
      method: 'POST',
      body: JSON.stringify({ guildId: currentGuildId, action: 'add', userId })
    });
    if (res.ok) {
      showToast(`User ${userId} whitelisted!`, 'success');
      input.value = '';
      loadAntiNukeData();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRemoveWhitelist(userId) {
  try {
    const res = await apiFetch('/api/antinuke/whitelist', {
      method: 'POST',
      body: JSON.stringify({ guildId: currentGuildId, action: 'remove', userId })
    });
    if (res.ok) {
      showToast(`User ${userId} removed from whitelist.`, 'info');
      loadAntiNukeData();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAntiNukeLogs(logs) {
  const tbody = document.getElementById('antinukeLogsTable');
  if (!logs || logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">✅ No security incidents detected. Server secure.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(l => `
    <tr>
      <td><strong>${escapeHtml(l.action_type)}</strong></td>
      <td><code>${escapeHtml(l.executor_id)}</code></td>
      <td><span class="badge-pill exact">${escapeHtml(l.punishment_taken)}</span></td>
      <td>${new Date(l.timestamp).toLocaleTimeString()}</td>
    </tr>
  `).join('');
}

// ----------------------------------------------------
// TICKET CONTROL
// ----------------------------------------------------
async function loadTickets() {
  try {
    const res = await apiFetch('/api/tickets');
    const data = await res.json();
    const tickets = data.tickets || [];

    document.getElementById('ticketCount').textContent = tickets.length;
    renderTicketsTable(tickets);
  } catch (err) {
    console.error('Failed to load tickets:', err);
  }
}

function renderTicketsTable(tickets) {
  const tbody = document.getElementById('ticketsTableBody');
  if (!tickets || tickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">🎉 No open tickets currently! All user requests are resolved.</td></tr>';
    return;
  }

  tbody.innerHTML = tickets.map(t => {
    const priority = t.priority || 'Medium';
    return `
      <tr>
        <td><strong># ${escapeHtml(t.channel_name)}</strong></td>
        <td>${escapeHtml(t.user_tag)}</td>
        <td><span class="badge-pill contains">${escapeHtml(t.department)}</span></td>
        <td>
          <select class="priority-select" onchange="handleTicketPriority('${t.channel_id}', this.value)">
            <option value="Low" ${priority === 'Low' ? 'selected' : ''}>🟢 Low</option>
            <option value="Medium" ${priority === 'Medium' ? 'selected' : ''}>🟡 Medium</option>
            <option value="High" ${priority === 'High' ? 'selected' : ''}>🟠 High</option>
            <option value="Urgent" ${priority === 'Urgent' ? 'selected' : ''}>🔴 Urgent</option>
          </select>
        </td>
        <td>${t.claimed_by ? `<code>${escapeHtml(t.claimed_by)}</code>` : '<span class="text-muted">Unclaimed</span>'}</td>
        <td>${new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-secondary btn-sm" onclick="handleTicketLock('${t.channel_id}')" title="Lock/Unlock Chat">🔒 Lock</button>
            <button class="btn btn-danger btn-sm" onclick="handleTicketClose('${t.channel_id}')" title="Close and Archive Ticket">🗑️ Close</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleTicketPriority(channelId, priority) {
  try {
    const res = await apiFetch('/api/tickets/action', {
      method: 'POST',
      body: JSON.stringify({ channelId, action: 'priority', priority })
    });
    if (res.ok) {
      showToast(`Priority set to ${priority}`, 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleTicketLock(channelId) {
  try {
    const res = await apiFetch('/api/tickets/action', {
      method: 'POST',
      body: JSON.stringify({ channelId, action: 'lock' })
    });
    if (res.ok) {
      showToast('Ticket lock toggled.', 'info');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleTicketClose(channelId) {
  if (!confirm('Are you sure you want to close and archive this ticket?')) return;
  try {
    const res = await apiFetch('/api/tickets/action', {
      method: 'POST',
      body: JSON.stringify({ channelId, action: 'close' })
    });
    if (res.ok) {
      showToast('Ticket closed and archived.', 'success');
      loadTickets();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// 24/7 VOICE STAY & VOICE WELCOME / GOODBYE
// ----------------------------------------------------
async function loadVoiceSettings() {
  try {
    const res = await apiFetch('/api/voice');
    const data = await res.json();
    if (!data) return;

    // 1. 24/7 Voice Stay
    const v247 = data.v247;
    const isConn = data.isConnected;
    const statusPill = document.getElementById('voice247StatusPill');
    if (statusPill) {
      if (v247 && v247.enabled) {
        statusPill.textContent = isConn ? '🟢 Active & Connected' : '🟡 Active (Reconnecting...)';
        statusPill.className = 'badge-pill exact';
      } else {
        statusPill.textContent = '⚪ Inactive';
        statusPill.className = 'badge-pill';
      }
    }

    if (v247 && v247.channel_id) {
      const vSelect = document.getElementById('voice247ChannelSelect');
      if (vSelect) vSelect.value = v247.channel_id;
    }
    if (v247 && typeof v247.deafened !== 'undefined') {
      const deafToggle = document.getElementById('voice247DeafenToggle');
      if (deafToggle) deafToggle.checked = Boolean(v247.deafened);
    }

    // 2. Voice Welcome & Leave
    const vWelcome = data.vWelcome;
    if (vWelcome) {
      const toggle = document.getElementById('voiceWelcomeToggle');
      if (toggle) toggle.checked = !!vWelcome.enabled;

      const mode = document.getElementById('voiceWelcomeMode');
      if (mode) mode.value = vWelcome.mode || 'vc_chat';

      const logCh = document.getElementById('voiceLogChannelSelect');
      if (logCh && vWelcome.log_channel_id) logCh.value = vWelcome.log_channel_id;

      const ttsToggle = document.getElementById('voiceTtsToggle');
      if (ttsToggle) ttsToggle.checked = !!vWelcome.tts_enabled;

      const wMsg = document.getElementById('voiceWelcomeMsg');
      if (wMsg && vWelcome.welcome_message) wMsg.value = vWelcome.welcome_message;

      const lMsg = document.getElementById('voiceLeaveMsg');
      if (lMsg && vWelcome.leave_message) lMsg.value = vWelcome.leave_message;
    }
  } catch (err) {
    console.error('Failed to load voice settings:', err);
  }
}

async function handleToggleVoice247(enable) {
  const channelSelect = document.getElementById('voice247ChannelSelect');
  const channelId = channelSelect ? channelSelect.value : '';
  const deafen = document.getElementById('voice247DeafenToggle').checked;

  if (enable && !channelId) {
    return showToast('Please select a voice channel first!', 'error');
  }

  try {
    const res = await apiFetch('/api/voice/247', {
      method: 'POST',
      body: JSON.stringify({
        guildId: currentGuildId,
        channelId,
        enabled: enable,
        deafen
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(enable ? '🟢 24/7 Voice Stay Enabled! Bot connected.' : '🔴 24/7 Voice Stay Disabled.', 'success');
      loadVoiceSettings();
    } else {
      showToast(data.error || 'Failed to update 24/7 status', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSaveVoiceWelcome() {
  const enabled = document.getElementById('voiceWelcomeToggle').checked;
  const mode = document.getElementById('voiceWelcomeMode').value;
  const log_channel_id = document.getElementById('voiceLogChannelSelect').value || null;
  const tts_enabled = document.getElementById('voiceTtsToggle').checked;
  const welcome_message = document.getElementById('voiceWelcomeMsg').value.trim();
  const leave_message = document.getElementById('voiceLeaveMsg').value.trim();

  try {
    const res = await apiFetch('/api/voice/welcome', {
      method: 'POST',
      body: JSON.stringify({
        guildId: currentGuildId,
        enabled,
        mode,
        log_channel_id,
        tts_enabled,
        welcome_message,
        leave_message
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Voice Welcome & Goodbye settings saved!', 'success');
    } else {
      showToast(data.error || 'Failed to save settings', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}
