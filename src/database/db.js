const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'bot.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for high performance and concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '!',
    welcome_channel_id TEXT,
    welcome_message TEXT DEFAULT 'Welcome to {server}, {user}! We now have {members} members 🎉',
    welcome_role_id TEXT,
    leave_channel_id TEXT,
    leave_message TEXT DEFAULT '{userTag} just left {server}. We are now at {members} members.',
    mod_log_channel_id TEXT,
    ticket_category_id TEXT,
    ticket_log_channel_id TEXT,
    ticket_support_role_id TEXT,
    suggestion_channel_id TEXT,
    automod_links INTEGER DEFAULT 0,
    automod_spam INTEGER DEFAULT 0,
    automod_badwords INTEGER DEFAULT 0,
    badwords_list TEXT DEFAULT 'discord.gg/,free-nitro,grabify,iplogger',
    maintenance_mode INTEGER DEFAULT 0,
    maintenance_message TEXT DEFAULT '🔧 **Server is currently under maintenance.** Please check back soon!'
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    reason TEXT DEFAULT 'No reason provided',
    department TEXT DEFAULT 'General Support',
    claimed_by TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'open',
    created_at INTEGER NOT NULL,
    closed_at INTEGER,
    closed_by TEXT
  );

  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS giveaways (
    message_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    prize TEXT NOT NULL,
    winners_count INTEGER DEFAULT 1,
    ends_at INTEGER NOT NULL,
    hosted_by TEXT NOT NULL,
    ended INTEGER DEFAULT 0,
    entries TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS auto_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    reply TEXT NOT NULL,
    match_type TEXT DEFAULT 'contains',
    created_by TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS member_counters (
    guild_id TEXT PRIMARY KEY,
    category_id TEXT,
    total_channel_id TEXT,
    members_channel_id TEXT,
    bots_channel_id TEXT,
    online_channel_id TEXT,
    boost_channel_id TEXT,
    goal_channel_id TEXT,
    member_goal INTEGER DEFAULT 500
  );

  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    upvotes TEXT DEFAULT '[]',
    downvotes TEXT DEFAULT '[]',
    status TEXT DEFAULT 'pending',
    staff_comment TEXT,
    staff_id TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS button_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    custom_id TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    emoji TEXT,
    style TEXT DEFAULT 'Secondary'
  );

  CREATE TABLE IF NOT EXISTS user_levels (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    last_xp_time INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS level_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 1,
    level_up_channel_id TEXT
  );

  CREATE TABLE IF NOT EXISTS polls (
    message_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    question TEXT NOT NULL,
    options_json TEXT NOT NULL,
    votes_json TEXT DEFAULT '{}',
    ends_at INTEGER,
    ended INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS auto_clean_channels (
    channel_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    delay_minutes INTEGER DEFAULT 5
  );

  CREATE TABLE IF NOT EXISTS antinuke_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 1,
    max_channel_deletes INTEGER DEFAULT 3,
    max_channel_creates INTEGER DEFAULT 4,
    max_ban_kicks INTEGER DEFAULT 3,
    max_role_deletes INTEGER DEFAULT 3,
    punishment TEXT DEFAULT 'ban',
    log_channel_id TEXT
  );

  CREATE TABLE IF NOT EXISTS antinuke_whitelist (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    added_by TEXT,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS antinuke_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    executor_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    punishment_taken TEXT NOT NULL,
    reason TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS server_backups (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    created_by TEXT
  );

  CREATE TABLE IF NOT EXISTS verification_settings (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    verified_role_id TEXT,
    message_id TEXT,
    enabled INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS voice_247 (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    text_channel_id TEXT,
    enabled INTEGER DEFAULT 1,
    deafened INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS voice_welcome_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 1,
    mode TEXT DEFAULT 'vc_chat',
    log_channel_id TEXT,
    tts_enabled INTEGER DEFAULT 0,
    welcome_message TEXT DEFAULT 'Welcome to {channel}, {user}! 👋',
    leave_message TEXT DEFAULT '{user} left {channel}. Hope to see you soon! 👋',
    track_duration INTEGER DEFAULT 1
  );
`);

// Safe column migrations in case tables existed previously
try { db.exec(`ALTER TABLE tickets ADD COLUMN department TEXT DEFAULT 'General Support'`); } catch (_) {}
try { db.exec(`ALTER TABLE tickets ADD COLUMN claimed_by TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE tickets ADD COLUMN image_url TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE tickets ADD COLUMN priority TEXT DEFAULT 'Medium'`); } catch (_) {}
try { db.exec(`ALTER TABLE guild_settings ADD COLUMN suggestion_channel_id TEXT`); } catch (_) {}

// Prepared statements
const stmts = {
  // Guild Settings
  getGuildSettings: db.prepare(`SELECT * FROM guild_settings WHERE guild_id = ?`),
  upsertGuildSetting: db.prepare(`
    INSERT INTO guild_settings (guild_id) VALUES (?)
    ON CONFLICT(guild_id) DO NOTHING
  `),

  // Tickets
  createTicket: db.prepare(`
    INSERT INTO tickets (guild_id, channel_id, user_id, reason, department, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?)
  `),
  getTicketByChannel: db.prepare(`SELECT * FROM tickets WHERE channel_id = ?`),
  getOpenUserTickets: db.prepare(`SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open'`),
  claimTicket: db.prepare(`UPDATE tickets SET claimed_by = ? WHERE channel_id = ?`),
  setTicketImage: db.prepare(`UPDATE tickets SET image_url = ? WHERE channel_id = ?`),
  closeTicket: db.prepare(`
    UPDATE tickets SET status = 'closed', closed_at = ?, closed_by = ? WHERE channel_id = ?
  `),

  // Warnings
  addWarning: db.prepare(`
    INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at)
    VALUES (?, ?, ?, ?, ?)
  `),
  getWarnings: db.prepare(`SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC`),
  clearWarnings: db.prepare(`DELETE FROM warnings WHERE guild_id = ? AND user_id = ?`),
  deleteWarningById: db.prepare(`DELETE FROM warnings WHERE id = ? AND guild_id = ?`),

  // Giveaways
  createGiveaway: db.prepare(`
    INSERT INTO giveaways (message_id, channel_id, guild_id, prize, winners_count, ends_at, hosted_by, ended, entries)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, '[]')
  `),
  getGiveaway: db.prepare(`SELECT * FROM giveaways WHERE message_id = ?`),
  getActiveGiveaways: db.prepare(`SELECT * FROM giveaways WHERE ended = 0`),
  updateGiveawayEntries: db.prepare(`UPDATE giveaways SET entries = ? WHERE message_id = ?`),
  endGiveaway: db.prepare(`UPDATE giveaways SET ended = 1 WHERE message_id = ?`),

  // Auto Replies
  getAutoReplies: db.prepare(`SELECT * FROM auto_replies WHERE guild_id = ?`),
  getAllAutoReplies: db.prepare(`SELECT * FROM auto_replies ORDER BY id DESC`),
  addAutoReply: db.prepare(`
    INSERT INTO auto_replies (guild_id, trigger, reply, match_type, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  deleteAutoReply: db.prepare(`DELETE FROM auto_replies WHERE id = ? AND guild_id = ?`),
  deleteAutoReplyById: db.prepare(`DELETE FROM auto_replies WHERE id = ?`),

  // Member Counters
  getMemberCounters: db.prepare(`SELECT * FROM member_counters WHERE guild_id = ?`),
  upsertMemberCounters: db.prepare(`
    INSERT INTO member_counters (guild_id, category_id, total_channel_id, members_channel_id, bots_channel_id, online_channel_id, boost_channel_id, goal_channel_id, member_goal)
    VALUES (@guild_id, @category_id, @total_channel_id, @members_channel_id, @bots_channel_id, @online_channel_id, @boost_channel_id, @goal_channel_id, @member_goal)
    ON CONFLICT(guild_id) DO UPDATE SET
      category_id = excluded.category_id,
      total_channel_id = excluded.total_channel_id,
      members_channel_id = excluded.members_channel_id,
      bots_channel_id = excluded.bots_channel_id,
      online_channel_id = excluded.online_channel_id,
      boost_channel_id = excluded.boost_channel_id,
      goal_channel_id = excluded.goal_channel_id,
      member_goal = excluded.member_goal
  `),
  updateMemberGoal: db.prepare(`UPDATE member_counters SET member_goal = ? WHERE guild_id = ?`),

  // Suggestions
  createSuggestion: db.prepare(`
    INSERT INTO suggestions (guild_id, channel_id, message_id, user_id, content, image_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  getSuggestionById: db.prepare(`SELECT * FROM suggestions WHERE id = ? AND guild_id = ?`),
  getSuggestionByMessageId: db.prepare(`SELECT * FROM suggestions WHERE message_id = ?`),
  updateSuggestionVotes: db.prepare(`UPDATE suggestions SET upvotes = ?, downvotes = ? WHERE message_id = ?`),
  reviewSuggestion: db.prepare(`
    UPDATE suggestions SET status = ?, staff_comment = ?, staff_id = ? WHERE id = ? AND guild_id = ?
  `),

  // Button Roles
  addButtonRole: db.prepare(`
    INSERT INTO button_roles (guild_id, message_id, role_id, custom_id, label, emoji, style)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  getButtonRoleByCustomId: db.prepare(`SELECT * FROM button_roles WHERE custom_id = ?`),
  getButtonRolesByMessage: db.prepare(`SELECT * FROM button_roles WHERE message_id = ?`),

  // Levels & XP
  getUserLevel: db.prepare(`SELECT * FROM user_levels WHERE guild_id = ? AND user_id = ?`),
  upsertUserLevel: db.prepare(`
    INSERT INTO user_levels (guild_id, user_id, xp, level, last_xp_time)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      xp = excluded.xp,
      level = excluded.level,
      last_xp_time = excluded.last_xp_time
  `),
  getLeaderboard: db.prepare(`
    SELECT * FROM user_levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ?
  `),
  getLevelSettings: db.prepare(`SELECT * FROM level_settings WHERE guild_id = ?`),
  upsertLevelSettings: db.prepare(`
    INSERT INTO level_settings (guild_id, enabled, level_up_channel_id)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      enabled = excluded.enabled,
      level_up_channel_id = excluded.level_up_channel_id
  `),

  // Polls
  createPoll: db.prepare(`
    INSERT INTO polls (message_id, channel_id, guild_id, question, options_json, votes_json, ends_at)
    VALUES (?, ?, ?, ?, ?, '{}', ?)
  `),
  getPoll: db.prepare(`SELECT * FROM polls WHERE message_id = ?`),
  updatePollVotes: db.prepare(`UPDATE polls SET votes_json = ? WHERE message_id = ?`),
  endPoll: db.prepare(`UPDATE polls SET ended = 1 WHERE message_id = ?`),

  // Auto Clean Channels
  getAutoCleanChannel: db.prepare(`SELECT * FROM auto_clean_channels WHERE channel_id = ?`),
  getAutoCleanChannels: db.prepare(`SELECT * FROM auto_clean_channels WHERE guild_id = ?`),
  upsertAutoCleanChannel: db.prepare(`
    INSERT INTO auto_clean_channels (channel_id, guild_id, delay_minutes)
    VALUES (?, ?, ?)
    ON CONFLICT(channel_id) DO UPDATE SET delay_minutes = excluded.delay_minutes
  `),
  deleteAutoCleanChannel: db.prepare(`DELETE FROM auto_clean_channels WHERE channel_id = ? AND guild_id = ?`),

  // Anti-Nuke Defender
  getAntiNukeSettings: db.prepare(`SELECT * FROM antinuke_settings WHERE guild_id = ?`),
  upsertAntiNukeSetting: db.prepare(`
    INSERT INTO antinuke_settings (guild_id) VALUES (?)
    ON CONFLICT(guild_id) DO NOTHING
  `),
  getAntiNukeWhitelist: db.prepare(`SELECT * FROM antinuke_whitelist WHERE guild_id = ?`),
  addAntiNukeWhitelist: db.prepare(`
    INSERT INTO antinuke_whitelist (guild_id, user_id, added_at, added_by)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO NOTHING
  `),
  removeAntiNukeWhitelist: db.prepare(`DELETE FROM antinuke_whitelist WHERE guild_id = ? AND user_id = ?`),
  isWhitelisted: db.prepare(`SELECT 1 FROM antinuke_whitelist WHERE guild_id = ? AND user_id = ?`),
  logAntiNuke: db.prepare(`
    INSERT INTO antinuke_logs (guild_id, executor_id, action_type, punishment_taken, reason, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  getAntiNukeLogs: db.prepare(`SELECT * FROM antinuke_logs WHERE guild_id = ? ORDER BY id DESC LIMIT ?`),

  // Server Backups
  insertBackup: db.prepare(`
    INSERT INTO server_backups (id, guild_id, name, data_json, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  getBackup: db.prepare(`SELECT * FROM server_backups WHERE id = ?`),
  getBackups: db.prepare(`SELECT id, guild_id, name, created_at, created_by FROM server_backups WHERE guild_id = ? ORDER BY created_at DESC`),
  deleteBackup: db.prepare(`DELETE FROM server_backups WHERE id = ?`),

  // Verification
  getVerification: db.prepare(`SELECT * FROM verification_settings WHERE guild_id = ?`),
  upsertVerification: db.prepare(`
    INSERT INTO verification_settings (guild_id, channel_id, verified_role_id, message_id, enabled)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      channel_id = excluded.channel_id,
      verified_role_id = excluded.verified_role_id,
      message_id = excluded.message_id,
      enabled = excluded.enabled
  `),

  // Tickets Extra
  getAllOpenTickets: db.prepare(`SELECT * FROM tickets WHERE guild_id = ? AND status = 'open' ORDER BY id DESC`),
  getAllOpenTicketsAllGuilds: db.prepare(`SELECT * FROM tickets WHERE status = 'open' ORDER BY id DESC`),
  updateTicketPriority: db.prepare(`UPDATE tickets SET priority = ? WHERE channel_id = ?`),

  // Voice 24/7
  getVoice247: db.prepare(`SELECT * FROM voice_247 WHERE guild_id = ?`),
  getAllVoice247: db.prepare(`SELECT * FROM voice_247 WHERE enabled = 1`),
  upsertVoice247: db.prepare(`
    INSERT INTO voice_247 (guild_id, channel_id, text_channel_id, enabled, deafened)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      channel_id = excluded.channel_id,
      text_channel_id = excluded.text_channel_id,
      enabled = excluded.enabled,
      deafened = excluded.deafened
  `),
  disableVoice247: db.prepare(`UPDATE voice_247 SET enabled = 0 WHERE guild_id = ?`),

  // Voice Welcome & Farewell
  getVoiceWelcome: db.prepare(`SELECT * FROM voice_welcome_settings WHERE guild_id = ?`),
  upsertVoiceWelcome: db.prepare(`
    INSERT INTO voice_welcome_settings (guild_id, enabled, mode, log_channel_id, tts_enabled, welcome_message, leave_message, track_duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      enabled = excluded.enabled,
      mode = excluded.mode,
      log_channel_id = excluded.log_channel_id,
      tts_enabled = excluded.tts_enabled,
      welcome_message = excluded.welcome_message,
      leave_message = excluded.leave_message,
      track_duration = excluded.track_duration
  `),
  initVoiceWelcome: db.prepare(`
    INSERT INTO voice_welcome_settings (guild_id) VALUES (?)
    ON CONFLICT(guild_id) DO NOTHING
  `)
};

module.exports = {
  db,

  // Settings
  getSettings(guildId) {
    stmts.upsertGuildSetting.run(guildId);
    return stmts.getGuildSettings.get(guildId);
  },

  getGuildSettings(guildId) {
    return this.getSettings(guildId);
  },

  updateSetting(guildId, field, value) {
    stmts.upsertGuildSetting.run(guildId);
    db.prepare(`UPDATE guild_settings SET ${field} = ? WHERE guild_id = ?`).run(value, guildId);
    return this.getSettings(guildId);
  },

  // Tickets
  createTicket(guildId, channelId, userId, reason, department = 'General Support') {
    return stmts.createTicket.run(guildId, channelId, userId, reason, department, Date.now());
  },

  getTicket(channelId) {
    return stmts.getTicketByChannel.get(channelId);
  },

  getUserOpenTickets(guildId, userId) {
    return stmts.getOpenUserTickets.all(guildId, userId);
  },

  claimTicket(channelId, staffId) {
    return stmts.claimTicket.run(staffId, channelId);
  },

  setTicketImage(channelId, imageUrl) {
    return stmts.setTicketImage.run(imageUrl, channelId);
  },

  closeTicket(channelId, closedBy) {
    return stmts.closeTicket.run(Date.now(), closedBy, channelId);
  },

  // Warnings
  addWarning(guildId, userId, moderatorId, reason) {
    return stmts.addWarning.run(guildId, userId, moderatorId, reason, Date.now());
  },

  getWarnings(guildId, userId) {
    return stmts.getWarnings.all(guildId, userId);
  },

  clearWarnings(guildId, userId) {
    return stmts.clearWarnings.run(guildId, userId);
  },

  deleteWarning(id, guildId) {
    return stmts.deleteWarningById.run(id, guildId);
  },

  // Giveaways
  createGiveaway(messageId, channelId, guildId, prize, winnersCount, endsAt, hostedBy) {
    return stmts.createGiveaway.run(messageId, channelId, guildId, prize, winnersCount, endsAt, hostedBy);
  },

  getGiveaway(messageId) {
    const gw = stmts.getGiveaway.get(messageId);
    if (gw) gw.entries = JSON.parse(gw.entries || '[]');
    return gw;
  },

  getActiveGiveaways() {
    const list = stmts.getActiveGiveaways.all();
    return list.map(gw => ({ ...gw, entries: JSON.parse(gw.entries || '[]') }));
  },

  toggleGiveawayEntry(messageId, userId) {
    const gw = this.getGiveaway(messageId);
    if (!gw || gw.ended) return null;

    let entries = gw.entries;
    const index = entries.indexOf(userId);
    let entered = false;

    if (index === -1) {
      entries.push(userId);
      entered = true;
    } else {
      entries.splice(index, 1);
      entered = false;
    }

    stmts.updateGiveawayEntries.run(JSON.stringify(entries), messageId);
    return { entered, total: entries.length };
  },

  endGiveaway(messageId) {
    return stmts.endGiveaway.run(messageId);
  },

  // Auto Replies
  getAutoReplies(guildId) {
    if (!guildId) return this.getAllAutoReplies();
    return stmts.getAutoReplies.all(guildId);
  },

  getAllAutoReplies() {
    return stmts.getAllAutoReplies.all();
  },

  addAutoReply(guildId, trigger, reply, matchType = 'contains', createdBy = null) {
    return stmts.addAutoReply.run(guildId, trigger.toLowerCase().trim(), reply, matchType, createdBy, Date.now());
  },

  deleteAutoReply(id, guildId) {
    if (!guildId) return this.deleteAutoReplyById(id);
    return stmts.deleteAutoReply.run(id, guildId);
  },

  deleteAutoReplyById(id) {
    return stmts.deleteAutoReplyById.run(id);
  },

  // Member Counters
  getMemberCounters(guildId) {
    return stmts.getMemberCounters.get(guildId);
  },

  saveMemberCounters(configObj) {
    return stmts.upsertMemberCounters.run(configObj);
  },

  setMemberGoal(guildId, goal) {
    return stmts.updateMemberGoal.run(goal, guildId);
  },

  // Suggestions
  createSuggestion(guildId, channelId, messageId, userId, content, imageUrl = null) {
    return stmts.createSuggestion.run(guildId, channelId, messageId, userId, content, imageUrl, Date.now());
  },

  getSuggestion(id, guildId) {
    const row = stmts.getSuggestionById.get(id, guildId);
    if (row) {
      row.upvotes = JSON.parse(row.upvotes || '[]');
      row.downvotes = JSON.parse(row.downvotes || '[]');
    }
    return row;
  },

  getSuggestionByMessage(messageId) {
    const row = stmts.getSuggestionByMessageId.get(messageId);
    if (row) {
      row.upvotes = JSON.parse(row.upvotes || '[]');
      row.downvotes = JSON.parse(row.downvotes || '[]');
    }
    return row;
  },

  voteSuggestion(messageId, userId, isUpvote) {
    const s = this.getSuggestionByMessage(messageId);
    if (!s || s.status !== 'pending') return null;

    let up = s.upvotes;
    let down = s.downvotes;

    const upIdx = up.indexOf(userId);
    const downIdx = down.indexOf(userId);

    if (isUpvote) {
      if (upIdx !== -1) {
        up.splice(upIdx, 1); // remove upvote
      } else {
        up.push(userId);
        if (downIdx !== -1) down.splice(downIdx, 1);
      }
    } else {
      if (downIdx !== -1) {
        down.splice(downIdx, 1); // remove downvote
      } else {
        down.push(userId);
        if (upIdx !== -1) up.splice(upIdx, 1);
      }
    }

    stmts.updateSuggestionVotes.run(JSON.stringify(up), JSON.stringify(down), messageId);
    return { upvotes: up.length, downvotes: down.length };
  },

  reviewSuggestion(id, guildId, status, staffComment, staffId) {
    return stmts.reviewSuggestion.run(status, staffComment, staffId, id, guildId);
  },

  // Button Roles
  addButtonRole(guildId, messageId, roleId, customId, label, emoji = null, style = 'Secondary') {
    return stmts.addButtonRole.run(guildId, messageId, roleId, customId, label, emoji, style);
  },

  getButtonRole(customId) {
    return stmts.getButtonRoleByCustomId.get(customId);
  },

  // Levels & XP
  getUserLevel(guildId, userId) {
    return stmts.getUserLevel.get(guildId, userId) || { guild_id: guildId, user_id: userId, xp: 0, level: 0, last_xp_time: 0 };
  },

  addXp(guildId, userId, amount) {
    const current = this.getUserLevel(guildId, userId);
    const newXp = current.xp + amount;
    // Formula: Level = Math.floor(0.1 * Math.sqrt(xp))
    const newLevel = Math.floor(0.1 * Math.sqrt(newXp));
    const leveledUp = newLevel > current.level;

    stmts.upsertUserLevel.run(guildId, userId, newXp, newLevel, Date.now());
    return { xp: newXp, level: newLevel, leveledUp };
  },

  getLeaderboard(guildId, limit = 10) {
    return stmts.getLeaderboard.all(guildId, limit);
  },

  // Polls
  createPoll(messageId, channelId, guildId, question, optionsJson, endsAt = null) {
    return stmts.createPoll.run(messageId, channelId, guildId, question, optionsJson, endsAt);
  },

  getPoll(messageId) {
    const p = stmts.getPoll.get(messageId);
    if (p) {
      p.options = JSON.parse(p.options_json || '[]');
      p.votes = JSON.parse(p.votes_json || '{}');
    }
    return p;
  },

  votePoll(messageId, userId, optionIndex) {
    const poll = this.getPoll(messageId);
    if (!poll || poll.ended) return null;

    poll.votes[userId] = optionIndex;
    stmts.updatePollVotes.run(JSON.stringify(poll.votes), messageId);
    return poll;
  },

  // Server Stats compatibility
  getServerStats(guildId) {
    return this.getMemberCounters(guildId);
  },

  setServerStats(guildId, totalChannelId, membersChannelId, botsChannelId) {
    return this.saveMemberCounters({
      guild_id: guildId,
      category_id: null,
      total_channel_id: totalChannelId,
      members_channel_id: membersChannelId,
      bots_channel_id: botsChannelId,
      online_channel_id: null,
      boost_channel_id: null,
      goal_channel_id: null,
      member_goal: 500
    });
  },

  // Auto Clean Channels
  getAutoClean(channelId) {
    return stmts.getAutoCleanChannel.get(channelId);
  },

  getAutoCleanList(guildId) {
    return stmts.getAutoCleanChannels.all(guildId);
  },

  setAutoClean(channelId, guildId, delayMinutes) {
    return stmts.upsertAutoCleanChannel.run(channelId, guildId, delayMinutes);
  },

  removeAutoClean(channelId, guildId) {
    return stmts.deleteAutoCleanChannel.run(channelId, guildId);
  },

  // Anti-Nuke Defender
  getAntiNukeSettings(guildId) {
    stmts.upsertAntiNukeSetting.run(guildId);
    return stmts.getAntiNukeSettings.get(guildId);
  },

  updateAntiNukeSetting(guildId, field, value) {
    stmts.upsertAntiNukeSetting.run(guildId);
    db.prepare(`UPDATE antinuke_settings SET ${field} = ? WHERE guild_id = ?`).run(value, guildId);
    return this.getAntiNukeSettings(guildId);
  },

  getAntiNukeWhitelist(guildId) {
    return stmts.getAntiNukeWhitelist.all(guildId);
  },

  addAntiNukeWhitelist(guildId, userId, addedBy = 'Admin') {
    return stmts.addAntiNukeWhitelist.run(guildId, userId, Date.now(), addedBy);
  },

  removeAntiNukeWhitelist(guildId, userId) {
    return stmts.removeAntiNukeWhitelist.run(guildId, userId);
  },

  isAntiNukeWhitelisted(guildId, userId) {
    const res = stmts.isWhitelisted.get(guildId, userId);
    return !!res;
  },

  logAntiNuke(guildId, executorId, actionType, punishmentTaken, reason) {
    return stmts.logAntiNuke.run(guildId, executorId, actionType, punishmentTaken, reason, Date.now());
  },

  getAntiNukeLogs(guildId, limit = 25) {
    return stmts.getAntiNukeLogs.all(guildId, limit);
  },

  // Server Backups
  createBackup(id, guildId, name, dataJson, createdBy = 'Staff') {
    return stmts.insertBackup.run(id, guildId, name, dataJson, Date.now(), createdBy);
  },

  getBackup(id) {
    return stmts.getBackup.get(id);
  },

  getBackups(guildId) {
    return stmts.getBackups.all(guildId);
  },

  deleteBackup(id) {
    return stmts.deleteBackup.run(id);
  },

  // Verification
  getVerificationSettings(guildId) {
    return stmts.getVerification.get(guildId);
  },

  saveVerificationSettings(guildId, channelId, roleId, messageId, enabled = 1) {
    return stmts.upsertVerification.run(guildId, channelId, roleId, messageId, enabled ? 1 : 0);
  },

  // Tickets Extra
  getAllOpenTickets(guildId) {
    if (guildId) return stmts.getAllOpenTickets.all(guildId);
    return stmts.getAllOpenTicketsAllGuilds.all();
  },

  setTicketPriority(channelId, priority) {
    return stmts.updateTicketPriority.run(priority, channelId);
  },

  // Voice 24/7
  getVoice247(guildId) {
    return stmts.getVoice247.get(guildId);
  },

  getAllVoice247() {
    return stmts.getAllVoice247.all();
  },

  saveVoice247(guildId, channelId, textChannelId = null, enabled = 1, deafened = 1) {
    return stmts.upsertVoice247.run(guildId, channelId, textChannelId, enabled ? 1 : 0, deafened ? 1 : 0);
  },

  disableVoice247(guildId) {
    return stmts.disableVoice247.run(guildId);
  },

  // Voice Welcome & Leave
  getVoiceWelcomeSettings(guildId) {
    stmts.initVoiceWelcome.run(guildId);
    return stmts.getVoiceWelcome.get(guildId);
  },

  saveVoiceWelcomeSettings(guildId, settings = {}) {
    const current = this.getVoiceWelcomeSettings(guildId) || {};
    const enabled = settings.enabled !== undefined ? (settings.enabled ? 1 : 0) : (current.enabled ?? 1);
    const mode = settings.mode !== undefined ? settings.mode : (current.mode ?? 'vc_chat');
    const logChannelId = settings.log_channel_id !== undefined ? settings.log_channel_id : (current.log_channel_id ?? null);
    const ttsEnabled = settings.tts_enabled !== undefined ? (settings.tts_enabled ? 1 : 0) : (current.tts_enabled ?? 0);
    const welcomeMsg = settings.welcome_message !== undefined ? settings.welcome_message : (current.welcome_message ?? 'Welcome to {channel}, {user}! 👋');
    const leaveMsg = settings.leave_message !== undefined ? settings.leave_message : (current.leave_message ?? '{user} left {channel}. Hope to see you soon! 👋');
    const trackDuration = settings.track_duration !== undefined ? (settings.track_duration ? 1 : 0) : (current.track_duration ?? 1);

    return stmts.upsertVoiceWelcome.run(guildId, enabled, mode, logChannelId, ttsEnabled, welcomeMsg, leaveMsg, trackDuration);
  }
};
