# 🤖 Server Maintainer & Multi-Tool Discord Bot

A complete, high-performance, all-in-one Discord bot built with **Discord.js v14**, **SQLite (better-sqlite3)**, and a **Built-in Web Control Dashboard**. Designed for modern community management, server maintenance, interactive ticketing, voice music streaming, automated moderation, giveaways, and custom triggers.

---

## 🌐 Web Control Dashboard (`http://localhost:3000`)
Access your bot's management portal directly from any web browser:
- **Live Server Telemetry**: Instant ping, uptime, guild counters, and memory metrics.
- **Remote Announcement Studio**: Compose embeds with custom category badges, color pickers, device banner attachments, and view an exact **live Discord preview** before posting!
- **Auto-Reply Trigger Engine**: Search, add (`contains`, `exact`, `startswith`), and delete keyword responses stored permanently in SQLite.
- **Remote Chat Cleaner**: Bulk purge messages (10, 25, 50, 100), filter bots/links/images, adjust channel slowmode, and lock/unlock channels.
- **Voice Music Deck**: Live player status, pause/resume, skip, and volume slider.
- **Admin Passcode Security**: Protected with `DASHBOARD_PASSCODE` in `.env` (default: `admin123`).

---

## 🌟 Master Feature Highlights (54 Slash Commands & Web Dashboard)

| Category | Highlights & Capabilities |
| :--- | :--- |
| **🎙️ 24/7 Voice Stay & VC Welcome** | Permanent 24/7 Voice Channel Stay with automated 5s recovery on reboots/drops, rich embed notifications whenever members join/leave/switch voice channels (showing duration spent in VC), plus spoken Audio TTS greetings! |
| **🛡️ Anti-Nuke & Server Defender** | Automated real-time detection for mass channel wipes, mass bans, rogue kicks, role deletions, and rogue bot additions. Configurable thresholds, auto-ban/kick/strip roles, admin whitelist, and emergency audit pings. |
| **💾 Disaster Recovery Backups** | Full snapshot backups of server channels, categories, voice channels, roles, and permissions stored in SQLite (`/backup`). |
| **🔒 Anti-Raid Verification Gate** | Interactive 1-click button verification portal (`/verify-setup`) to block raid bots before they can view or spam channels. |
| **🌐 Web Control Center** | Complete browser control panel for announcements, live embed previews, auto-replies, remote message purges, slowmode, Anti-Nuke, 24/7 Voice, and ticket management. |
| **🎫 Pro Ticket Control Desk** | Interactive Product Purchase panels (`Hex Corporation` style), support desk, **Live Web Dashboard Ticket Desk**, priority tagging (🟢 Low, 🟡 Medium, 🟠 High, 🔴 Urgent), channel rename, staff transfer, and exportable HTML transcripts. |
| **🧹 Chat & Message Cleaner** | Multi-target purge filters (`bots`, `humans`, `links`, `invites`, `images`, `text`), instant `/nuke` channel reset with GIF (bypasses 14-day limit), `/slowmode`, `/lock` & `/unlock`, and timed `/autoclean` self-destruct channels. |
| **📊 Advanced Member Counters** | Live auto-updating voice channels: `👥 Total: 1,250`, `👤 Members: 1,200`, `🤖 Bots: 50`, `🟢 Online: 420`, `🚀 Boosts: 8 (Tier 2)`, and `🎯 Goal: 1,250/1,500`. Auto-updates with custom milestones. |
| **📢 Professional Announcements & Changelogs** | Publish rich announcements with **Direct Image File Upload** from your computer or phone, category badges, custom link buttons (Website, Discord), and structured Version Release Patch Notes (`/announce changelog`). |
| **🎨 Custom Embed Builder** | Powerful embed builder supporting direct device banner & thumbnail file attachments, theme color presets, footer, and multiple custom field blocks. |
| **💡 Suggestion System** | Community suggestion board with real-time `👍 Upvote` and `👎 Downvote` buttons, status tracking (`Pending`, `Approved`, `Denied`, `Implemented`), and staff comment stamps. |
| **🎭 Button Roles** | Self-assignable role panels with interactive buttons. Members click buttons to instantly grant or remove roles with ephemeral notifications. |
| **📊 Community Polls** | Create polls with multiple choices, interactive button voting, and dynamic real-time percentage progress bars (`[████░░░░░░] 45%`). |
| **⭐ Leveling & XP System** | Activity-based chat XP rewards with anti-spam cooldown, level up banners, visual progress rank cards (`/rank`), and server top 10 leaderboard (`/leaderboard`). |
| **💬 Auto Reply & Triggers** | Custom keyword triggers stored permanently in SQLite with `contains`, `exact`, and `startswith` matching rules. |
| **🎵 Voice Music Bot** | Audio playback with queue system, pause/resume, skip, volume adjustment (1–150%), `/join` & `/leave`, and interactive player control buttons. |
| **👋 Welcome & Goodbye** | Automated welcome embeds with member avatar, custom templates (`{user}`, `{server}`, `{members}`), auto-role assignment, and leave notices. |
| **🛡️ Moderation & Automod** | Warn system with SQLite history, timeouts (mutes), kicks, bans with message deletion, mod log channel, and automod (anti-invite links, anti-spam rate limiter, bad word filter). |
| **🎉 Giveaways** | Live countdowns, one-click button entry with real-time entry count, automatic winner drawing, and winner rerolls. |
| **🔧 Server Maintenance** | Server maintenance mode toggle, emergency channel lockdowns, and status monitoring. |

---

## 📖 Command Reference

### 🛡️ 1. Anti-Nuke & Server Defender
- `/antinuke status` - Check defender health, thresholds, punishment, and recent interception alerts.
- `/antinuke toggle <enabled>` - Enable or disable the Anti-Nuke raid protection shield.
- `/antinuke setlimit <category> <limit>` - Set action limit per 10s (Channel Deletions, Channel Creations, Bans/Kicks, Role Deletions).
- `/antinuke punishment <ban|kick|strip_roles>` - Configure punishment executed when rate limits are breached.
- `/antinuke whitelist add <user>` - Add a trusted administrator to the whitelist (exempt from limits).
- `/antinuke whitelist remove <user>` - Remove an administrator from the whitelist.
- `/antinuke whitelist list` - View all whitelisted administrators.
- `/antinuke logchannel <channel>` - Set emergency channel for anti-nuke alert pings.
- `/antinuke logs` - View the last 10 intercepted raid/nuke incidents.
- `/verify-setup <channel> <role>` - Deploy interactive verification button portal to block raid bots.
- `/backup create [name]` - Create a full snapshot backup of all server channels, categories, and roles.
- `/backup list` - View all saved server backups.
- `/backup info <id>` - Inspect stored snapshot details.
- `/backup delete <id>` - Delete a backup snapshot.

### 🎙️ 2. 24/7 Voice Stay & Voice Welcome / Goodbye
- `/voice-247 enable [channel] [deafen]` - Lock bot into a voice channel 24/7 with auto-rejoin on reboot/drops.
- `/voice-247 disable` - Disable 24/7 stay mode and disconnect from voice.
- `/voice-247 status` - Check current 24/7 connection health, locked channel, and state.
- `/voice-welcome status` - View voice join/leave notification settings.
- `/voice-welcome toggle <enabled>` - Turn voice channel join/leave alerts ON or OFF.
- `/voice-welcome mode <vc_chat|log_channel|both>` - Choose where alerts are sent (in VC chat, log channel, or both).
- `/voice-welcome logchannel <channel>` - Set dedicated text channel for voice join/leave logs.
- `/voice-welcome message <welcome|leave> <text>` - Set custom message templates (`{user}`, `{userName}`, `{channel}`, `{members}`, `{server}`).
- `/voice-welcome tts <enabled>` - Toggle spoken Audio TTS voice greetings when users join the bot's channel.

### 🎵 3. Voice Music Player
- `/join [channel]` - Summon the bot to immediately join your voice channel.
- `/leave` - Disconnect the bot from the voice channel (pauses 24/7 mode).
- `/play <query_or_url>` - Search and play any track in your voice channel.
- `/pause` - Pause music playback.
- `/resume` - Resume paused music playback.
- `/skip` - Skip current track.
- `/stop` - Stop audio and clear queue (preserves 24/7 connection if active).
- `/queue` - Display active queue with song list and duration.
- `/nowplaying` - View currently playing track with interactive control buttons.
- `/volume <percent>` - Adjust volume (1% to 150%).

### 🎫 2. Ticket System & Control Desk
- `/ticket-setup product-panel` - Deploy interactive product purchase dropdown panel (`Hex Corporation` presets).
- `/ticket-setup support-panel` - Deploy multi-department general support portal.
- `/ticket list` - View all active open tickets on the server with department, owner, claimed staff, and duration.
- `/ticket priority <level>` - Set ticket urgency (`🟢 Low`, `🟡 Medium`, `🟠 High`, `🔴 Urgent`).
- `/ticket rename <name>` - Rename the ticket channel (e.g. `urgent-report-john`).
- `/ticket transfer <staff>` - Transfer ticket handling to another staff member.
- `/ticket alert [note]` - Ping the ticket creator with an attention notice.
- `/ticket claim` - Claim ticket as the handling moderator.
- `/ticket image <file>` - Upload a screenshot or proof image directly into the ticket channel.
- `/ticket close` - Close and archive the ticket, generating an HTML transcript sent to logs and user DM.
- `/ticket transcript` - Generate and download an HTML transcript file of the current ticket channel.
- `/ticket lock` - Lock or unlock the ticket from member messaging.
- `/ticket add <member>` - Add an additional member to the ticket channel.
- `/ticket remove <member>` - Remove a member from the ticket channel.

### 📢 3. Announcements, Embeds & Changelogs
- `/announce post` - Create announcements with direct image file upload, category badges, role/@everyone pings, and interactive link buttons.
- `/announce changelog` - Post structured patch notes with version, new features, improvements, bug fixes, and banner.
- `/embed` - Custom styled embed builder with device banner & thumbnail file uploads, colors, and multiple fields.

### 💡 4. Suggestion System
- `/suggest <idea> [screenshot]` - Submit a community suggestion with optional mockup/proof image.
- `/suggestion-setup <channel>` - Configure the feed channel where community suggestions are posted.
- `/suggestion-review <id> <status> [comment]` - Approve, reject, or mark a suggestion as implemented with staff feedback.

### 🎭 5. Button Roles
- `/buttonroles <channel> <title> <desc> <role1> <label1> [role2] [role3]` - Deploy interactive self-assignable role buttons.

### 📊 6. Community Polls
- `/poll <question> <option1> <option2> [opt3] [opt4] [duration]` - Launch a community poll with interactive button voting and live progress bars.

### ⭐ 7. Leveling & XP
- `/rank [target]` - View your level, XP, and visual rank progress bar.
- `/leaderboard` - View the top 10 most active members on the server.

### 💬 8. Auto Reply Engine
- `/autoreply add <trigger> <response> [match-type]` - Add an automatic trigger response (`contains`, `exact`, `startswith`).
- `/autoreply remove <id>` - Remove an auto-reply by its database ID.
- `/autoreply list` - View all configured triggers for the server.

### 🎵 9. Music Player
- `/join [channel]` - Summon the bot to immediately join your voice channel.
- `/leave` - Disconnect the bot from the voice channel.
- `/play <query_or_url>` - Search and play any track in your voice channel.
- `/pause` - Pause music playback.
- `/resume` - Resume paused music playback.
- `/skip` - Skip current track.
- `/stop` - Stop audio, clear queue, and disconnect.
- `/queue` - Display active queue with song list and duration.
- `/nowplaying` - View currently playing track with interactive control buttons.
- `/volume <percent>` - Adjust volume (1% to 150%).

### 👋 10. Welcome & Goodbye
- `/welcome-setup` - Configure welcome channel, auto-role given to new joins, custom welcome message, and leave/goodbye channel.
- `/welcome-test` - Simulate a new member join to preview your embed.

### 🛡️ 11. Moderation & Automod
- `/warn <target> <reason>` - Issue an official warning (logs to SQLite, DMs user, posts to mod log).
- `/warnings <target>` - View warning history for a user.
- `/clearwarns <target> [warning-id]` - Clear all warnings or a specific warning ID.
- `/timeout <target> <duration> [reason]` - Timeout/mute a member (e.g. `5m`, `1h`, `1d`).
- `/untimeout <target>` - Remove timeout restriction from a member.
- `/kick <target> [reason]` - Kick a member from the server.
- `/ban <target> [reason] [delete-days]` - Ban a user with optional message history purge.
- `/unban <userid> [reason]` - Unban a user by their user ID.
- `/modlog-setup [channel] [disable]` - Configure channel for moderation action logs.
- `/automod status` - View status of anti-invite, anti-spam, and bad word filters.
- `/automod toggle <feature> <enabled>` - Toggle anti-link, anti-spam, or bad word filters.
- `/automod words <action> <phrase>` - Add or remove words from the automod blacklist.

### 🧹 12. Chat & Message Cleaner Suite
- `/clear messages <amount> [user]` - Bulk delete messages with optional member filter (1–100).
- `/clear bots <amount>` - Remove bot and webhook messages only.
- `/clear humans <amount>` - Delete messages sent by human members only.
- `/clear links <amount>` - Purge any messages containing URLs or links.
- `/clear invites <amount>` - Clean Discord invite links (`discord.gg/...`).
- `/clear images <amount>` - Wipe messages containing image attachments or media embeds.
- `/clear text <amount> <keyword>` - Delete messages containing a specific keyword or phrase.
- `/nuke` - Complete channel reset: clones permissions & settings, deletes old channel, and posts a visual nuke animation (bypasses Discord's 14-day bulk-delete restriction).
- `/slowmode <seconds> [channel]` - Set per-user message cooldown (0 to 21600 seconds / 6 hours).
- `/lock [channel] [reason]` - Lock channel by denying `SendMessages` permission for `@everyone`.
- `/unlock [channel]` - Unlock channel and restore normal messaging for `@everyone`.
- `/autoclean set <channel> <minutes>` - Enable auto-clean: automatically deletes incoming messages after X minutes.
- `/autoclean remove <channel>` - Disable auto-clean on a channel.
- `/autoclean list` - View all active auto-cleaning channels on the server.

### 🎉 13. Giveaways
- `/giveaway start <prize> <duration> [winners] [channel]` - Start an interactive giveaway with a countdown and entry button.
- `/giveaway end <message-id>` - Immediately end an active giveaway and pick winners.
- `/giveaway reroll <message-id>` - Pick a new winner for an ended giveaway.

### 🔧 14. Server Maintenance
- `/maintenance toggle <enabled> [message]` - Toggle maintenance mode for the server.
- `/maintenance status` - Check current maintenance status and notice message.
- `/maintenance lockdown <lock>` - Lock or unlock the current channel for regular members.

### 📊 15. General & Utility
- `/help` - Interactive categorical help menu with dropdown selection.
- `/ping` - Check bot latency and Discord API response time.
- `/serverinfo` - Display comprehensive server statistics, roles, boosts, and asset counts.
- `/userinfo [target]` - View detailed member profile, permissions, and join dates.
- `/botinfo` - Check bot uptime, memory usage, Node.js version, and OS platform.

---

## 🗄️ Database Storage

The bot uses **SQLite** through `better-sqlite3`. All data is stored locally in `data/bot.sqlite`. No external database servers or cloud accounts required!
- Automated WAL mode for fast queries
- Zero setup or migration maintenance
