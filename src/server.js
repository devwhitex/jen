const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('./database/db');
const musicManager = require('./music/player');
const TicketManager = require('./services/ticketManager');
const voiceService = require('./services/voiceService');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (_) {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-passcode',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function startKeepAliveServer(client) {
  const PORT = process.env.PORT || 3000;
  const ADMIN_PASSCODE = process.env.DASHBOARD_PASSCODE || 'admin123';
  const publicDir = path.join(__dirname, '..', 'public');

  const server = http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-passcode',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
      });
      return res.end();
    }

    let pathname = '/';
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      pathname = parsedUrl.pathname;
    } catch (_) {
      pathname = req.url.split('?')[0];
    }

    // --- 24/7 Keep-Alive Uptime Endpoints ---
    if (pathname === '/health' || pathname === '/ping' || pathname === '/status') {
      const uptimeSec = Math.floor(process.uptime());
      return sendJson(res, 200, {
        status: 'online',
        service: 'Server Maintainer Discord Bot',
        botTag: client.user ? client.user.tag : 'Connecting...',
        botId: client.user ? client.user.id : null,
        uptimeSeconds: uptimeSec,
        pingMs: client.ws ? client.ws.ping : 0,
        guildsCount: client.guilds ? client.guilds.cache.size : 0,
        timestamp: new Date().toISOString()
      });
    }

    // --- Authentication Endpoint ---
    if (pathname === '/api/login' && req.method === 'POST') {
      const body = await parseBody(req);
      if (body.passcode === ADMIN_PASSCODE) {
        return sendJson(res, 200, { success: true, message: 'Authentication successful' });
      }
      return sendJson(res, 401, { success: false, error: 'Invalid admin passcode' });
    }

    // --- Protect All /api/* Routes ---
    if (pathname.startsWith('/api/')) {
      const authHeader = req.headers['x-admin-passcode'];
      if (authHeader !== ADMIN_PASSCODE) {
        return sendJson(res, 401, { error: 'Unauthorized: Invalid admin passcode' });
      }

      try {

      // 1. GET /api/stats
      if (pathname === '/api/stats' && req.method === 'GET') {
        const uptimeSec = Math.floor(process.uptime());
        const hours = Math.floor(uptimeSec / 3600);
        const minutes = Math.floor((uptimeSec % 3600) / 60);
        const seconds = uptimeSec % 60;

        let totalMembers = 0;
        const guildsList = [];

        if (client.guilds) {
          for (const guild of client.guilds.cache.values()) {
            totalMembers += guild.memberCount;
            const textChannels = guild.channels.cache
              .filter(c => c.type === ChannelType.GuildText)
              .map(c => ({ id: c.id, name: c.name }));

            const voiceChannels = guild.channels.cache
              .filter(c => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice)
              .map(c => ({ id: c.id, name: c.name }));

            guildsList.push({
              id: guild.id,
              name: guild.name,
              memberCount: guild.memberCount,
              icon: guild.iconURL(),
              textChannels,
              voiceChannels
            });
          }
        }

        const primaryGuildId = guildsList[0]?.id;
        const guildSettings = primaryGuildId ? db.getGuildSettings(primaryGuildId) : null;
        const activeQueue = primaryGuildId ? musicManager.getQueue(primaryGuildId) : null;

        return sendJson(res, 200, {
          bot: {
            id: client.user?.id,
            username: client.user?.username,
            tag: client.user?.tag,
            avatar: client.user?.displayAvatarURL()
          },
          uptime: `${hours}h ${minutes}m ${seconds}s`,
          uptimeSeconds: uptimeSec,
          ping: client.ws ? client.ws.ping : 0,
          guildsCount: client.guilds?.cache.size || 0,
          totalMembers,
          commandsCount: client.commands?.size || 49,
          maintenanceActive: guildSettings?.maintenance_mode === 1,
          maintenanceMessage: guildSettings?.maintenance_message || '',
          guilds: guildsList,
          music: {
            isPlaying: !!activeQueue?.currentSong,
            isPaused: activeQueue?.player?.state?.status === 'paused',
            currentTrack: activeQueue?.currentSong || null,
            volume: activeQueue?.volume || 100,
            voiceChannelName: activeQueue?.voiceChannel?.name || null
          }
        });
      }

      // 2. POST /api/announce
      if (pathname === '/api/announce' && req.method === 'POST') {
        const body = await parseBody(req);
        const { channelId, title, badge, description, imageUrl, color, ping } = body;

        if (!channelId || !title || !description) {
          return sendJson(res, 400, { error: 'Missing channelId, title, or description' });
        }

        const channel = client.channels.cache.get(channelId);
        if (!channel) {
          return sendJson(res, 404, { error: 'Target channel not found in bot cache' });
        }

        const embed = new EmbedBuilder()
          .setTitle(`${badge ? badge + '\n' : ''}${title}`)
          .setDescription(description)
          .setColor(color || '#5865F2')
          .setFooter({ text: 'Server Maintainer • Announcement' })
          .setTimestamp();

        if (imageUrl) embed.setImage(imageUrl);

        let content = null;
        if (ping === 'everyone') content = '@everyone';
        else if (ping === 'here') content = '@here';

        try {
          await channel.send({ content, embeds: [embed] });
          return sendJson(res, 200, { success: true });
        } catch (err) {
          return sendJson(res, 500, { error: `Failed to send to Discord: ${err.message}` });
        }
      }

      // 3. GET /api/autoreplies
      if (pathname === '/api/autoreplies' && req.method === 'GET') {
        const list = db.getAllAutoReplies();
        const formatted = list.map(item => ({
          id: item.id,
          trigger_text: item.trigger,
          response_text: item.reply,
          match_type: item.match_type
        }));
        return sendJson(res, 200, { triggers: formatted });
      }

      // 4. POST /api/autoreplies
      if (pathname === '/api/autoreplies' && req.method === 'POST') {
        const body = await parseBody(req);
        const { trigger, response, matchType, guildId } = body;

        if (!trigger || !response) {
          return sendJson(res, 400, { error: 'Trigger and response are required' });
        }

        const targetGuild = guildId || client.guilds.cache.first()?.id;
        if (!targetGuild) {
          return sendJson(res, 400, { error: 'No active server guild found' });
        }

        db.addAutoReply(targetGuild, trigger, response, matchType || 'contains', 'Dashboard Admin');
        return sendJson(res, 200, { success: true });
      }

      // 5. DELETE /api/autoreplies/:id
      if (pathname.startsWith('/api/autoreplies/') && req.method === 'DELETE') {
        const id = parseInt(pathname.split('/').pop(), 10);
        if (!id) return sendJson(res, 400, { error: 'Invalid ID' });

        db.deleteAutoReplyById(id);
        return sendJson(res, 200, { success: true });
      }

      // 6. POST /api/clean/purge
      if (pathname === '/api/clean/purge' && req.method === 'POST') {
        const body = await parseBody(req);
        const { channelId, amount } = body;
        const channel = client.channels.cache.get(channelId);

        if (!channel) return sendJson(res, 404, { error: 'Channel not found' });
        const purgeCount = Math.min(Math.max(parseInt(amount, 10) || 10, 1), 100);

        try {
          const deleted = await channel.bulkDelete(purgeCount, true);
          return sendJson(res, 200, { success: true, deleted: deleted.size });
        } catch (err) {
          return sendJson(res, 500, { error: err.message });
        }
      }

      // 7. POST /api/clean/filter
      if (pathname === '/api/clean/filter' && req.method === 'POST') {
        const body = await parseBody(req);
        const { channelId, filterType, amount } = body;
        const channel = client.channels.cache.get(channelId);

        if (!channel) return sendJson(res, 404, { error: 'Channel not found' });
        const fetchLimit = Math.min(Math.max(parseInt(amount, 10) || 50, 1), 100);

        try {
          const messages = await channel.messages.fetch({ limit: fetchLimit });
          let toDelete;

          if (filterType === 'bots') {
            toDelete = messages.filter(m => m.author.bot || m.webhookId);
          } else if (filterType === 'links') {
            toDelete = messages.filter(m => /(https?:\/\/[^\s]+)/gi.test(m.content));
          } else if (filterType === 'images') {
            toDelete = messages.filter(m => m.attachments.size > 0 || m.embeds.some(e => e.image || e.thumbnail));
          } else {
            toDelete = messages;
          }

          const deleted = await channel.bulkDelete(toDelete, true);
          return sendJson(res, 200, { success: true, deleted: deleted.size });
        } catch (err) {
          return sendJson(res, 500, { error: err.message });
        }
      }

      // 8. POST /api/clean/slowmode
      if (pathname === '/api/clean/slowmode' && req.method === 'POST') {
        const body = await parseBody(req);
        const { channelId, seconds } = body;
        const channel = client.channels.cache.get(channelId);

        if (!channel) return sendJson(res, 404, { error: 'Channel not found' });

        try {
          await channel.setRateLimitPerUser(Math.max(0, parseInt(seconds, 10) || 0));
          return sendJson(res, 200, { success: true });
        } catch (err) {
          return sendJson(res, 500, { error: err.message });
        }
      }

      // 9. POST /api/clean/lock
      if (pathname === '/api/clean/lock' && req.method === 'POST') {
        const body = await parseBody(req);
        const { channelId, lock } = body;
        const channel = client.channels.cache.get(channelId);

        if (!channel) return sendJson(res, 404, { error: 'Channel not found' });

        try {
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            SendMessages: lock ? false : null
          });
          return sendJson(res, 200, { success: true, locked: !!lock });
        } catch (err) {
          return sendJson(res, 500, { error: err.message });
        }
      }

      // 10. POST /api/music/action
      if (pathname === '/api/music/action' && req.method === 'POST') {
        const body = await parseBody(req);
        const { guildId, action } = body;
        const targetGuildId = guildId || client.guilds.cache.first()?.id;
        const queue = musicManager.getQueue(targetGuildId);

        if (!queue) {
          return sendJson(res, 400, { error: 'No active music queue in this server' });
        }

        if (action === 'pause') {
          if (queue.player.state.status === 'paused') queue.player.unpause();
          else queue.player.pause();
        } else if (action === 'skip') {
          queue.player.stop();
        } else if (action === 'stop') {
          queue.destroy();
        }

        return sendJson(res, 200, { success: true });
      }

      // 11. POST /api/music/volume
      if (pathname === '/api/music/volume' && req.method === 'POST') {
        const body = await parseBody(req);
        const { guildId, volume } = body;
        const targetGuildId = guildId || client.guilds.cache.first()?.id;
        const queue = musicManager.getQueue(targetGuildId);

        if (queue) {
          queue.setVolume(parseInt(volume, 10) || 100);
        }
        return sendJson(res, 200, { success: true });
      }

      // 12. POST /api/maintenance/toggle
      if (pathname === '/api/maintenance/toggle' && req.method === 'POST') {
        const body = await parseBody(req);
        const { guildId, enabled } = body;
        const targetGuildId = guildId || client.guilds.cache.first()?.id;

        if (targetGuildId) {
          db.updateSetting(targetGuildId, 'maintenance_mode', enabled ? 1 : 0);
        }
        return sendJson(res, 200, { success: true, enabled: !!enabled });
      }

      // 13. POST /api/maintenance/message
      if (pathname === '/api/maintenance/message' && req.method === 'POST') {
        const body = await parseBody(req);
        const { guildId, message } = body;
        const targetGuildId = guildId || client.guilds.cache.first()?.id;

        if (targetGuildId && message) {
          db.updateSetting(targetGuildId, 'maintenance_message', message);
        }
        return sendJson(res, 200, { success: true });
      }

      // 14. GET /api/antinuke
      if (pathname === '/api/antinuke' && req.method === 'GET') {
        const guildId = client.guilds.cache.first()?.id;
        const settings = guildId ? db.getAntiNukeSettings(guildId) : null;
        const whitelist = guildId ? db.getAntiNukeWhitelist(guildId) : [];
        const logs = guildId ? db.getAntiNukeLogs(guildId, 25) : [];
        return sendJson(res, 200, { settings, whitelist, logs });
      }

      // 15. POST /api/antinuke/settings
      if (pathname === '/api/antinuke/settings' && req.method === 'POST') {
        const body = await parseBody(req);
        const guildId = body.guildId || client.guilds.cache.first()?.id;
        if (!guildId) return sendJson(res, 400, { error: 'No guild' });

        if ('enabled' in body) db.updateAntiNukeSetting(guildId, 'enabled', body.enabled ? 1 : 0);
        if (body.punishment) db.updateAntiNukeSetting(guildId, 'punishment', body.punishment);
        if (body.max_channel_deletes) db.updateAntiNukeSetting(guildId, 'max_channel_deletes', parseInt(body.max_channel_deletes, 10));
        if (body.max_channel_creates) db.updateAntiNukeSetting(guildId, 'max_channel_creates', parseInt(body.max_channel_creates, 10));
        if (body.max_ban_kicks) db.updateAntiNukeSetting(guildId, 'max_ban_kicks', parseInt(body.max_ban_kicks, 10));
        if (body.max_role_deletes) db.updateAntiNukeSetting(guildId, 'max_role_deletes', parseInt(body.max_role_deletes, 10));
        if (body.log_channel_id) db.updateAntiNukeSetting(guildId, 'log_channel_id', body.log_channel_id);

        return sendJson(res, 200, { success: true });
      }

      // 16. POST /api/antinuke/whitelist
      if (pathname === '/api/antinuke/whitelist' && req.method === 'POST') {
        const body = await parseBody(req);
        const guildId = body.guildId || client.guilds.cache.first()?.id;
        if (body.action === 'add' && body.userId) {
          db.addAntiNukeWhitelist(guildId, body.userId, 'Dashboard Admin');
        } else if (body.action === 'remove' && body.userId) {
          db.removeAntiNukeWhitelist(guildId, body.userId);
        }
        return sendJson(res, 200, { success: true });
      }

      // 17. GET /api/tickets
      if (pathname === '/api/tickets' && req.method === 'GET') {
        const guildId = client.guilds.cache.first()?.id;
        const tickets = db.getAllOpenTickets(guildId);
        const enriched = tickets.map(t => {
          const ch = client.channels.cache.get(t.channel_id);
          const user = client.users.cache.get(t.user_id);
          return {
            id: t.id,
            channel_id: t.channel_id,
            channel_name: ch ? ch.name : 'unknown',
            user_id: t.user_id,
            user_tag: user ? user.tag : t.user_id,
            department: t.department || 'General Support',
            priority: t.priority || 'Medium',
            claimed_by: t.claimed_by || null,
            created_at: t.created_at
          };
        });
        return sendJson(res, 200, { tickets: enriched });
      }

      // 18. POST /api/tickets/action
      if (pathname === '/api/tickets/action' && req.method === 'POST') {
        const body = await parseBody(req);
        const { channelId, action, priority } = body;
        const channel = client.channels.cache.get(channelId);
        if (!channel) return sendJson(res, 404, { error: 'Ticket channel not found' });

        if (action === 'priority' && priority) {
          db.setTicketPriority(channelId, priority);
          return sendJson(res, 200, { success: true });
        }

        if (action === 'lock') {
          await TicketManager.toggleLock(channel, { user: { username: 'Web Dashboard Admin' } });
          return sendJson(res, 200, { success: true });
        }

        if (action === 'close') {
          await TicketManager.closeTicket(channel, { tag: 'Web Dashboard Admin' });
          return sendJson(res, 200, { success: true });
        }

        return sendJson(res, 400, { error: 'Unknown action' });
      }

      // 19. GET /api/voice
      if (pathname === '/api/voice' && req.method === 'GET') {
        const guildId = client.guilds.cache.first()?.id;
        const v247 = guildId ? db.getVoice247(guildId) : null;
        const vWelcome = guildId ? db.getVoiceWelcomeSettings(guildId) : null;
        const guild = guildId ? client.guilds.cache.get(guildId) : null;
        const isConnected = Boolean(voiceService.connections.get(guildId) || guild?.members?.me?.voice?.channelId);
        const currentChannelId = guild?.members?.me?.voice?.channelId || null;

        return sendJson(res, 200, {
          v247,
          vWelcome,
          isConnected,
          currentChannelId
        });
      }

      // 20. POST /api/voice/247
      if (pathname === '/api/voice/247' && req.method === 'POST') {
        const body = await parseBody(req);
        const guildId = body.guildId || client.guilds.cache.first()?.id;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return sendJson(res, 404, { error: 'Guild not found' });

        if (body.enabled) {
          const channel = guild.channels.cache.get(body.channelId);
          if (!channel || !channel.isVoiceBased()) {
            return sendJson(res, 400, { error: 'Invalid voice channel selected' });
          }
          await voiceService.connect247(guild, channel, body.deafen ?? true);
          return sendJson(res, 200, { success: true, message: `Locked into ${channel.name} 24/7` });
        } else {
          voiceService.disconnect247(guildId);
          return sendJson(res, 200, { success: true, message: '24/7 stay disabled' });
        }
      }

      // 21. POST /api/voice/welcome
      if (pathname === '/api/voice/welcome' && req.method === 'POST') {
        const body = await parseBody(req);
        const guildId = body.guildId || client.guilds.cache.first()?.id;
        if (!guildId) return sendJson(res, 404, { error: 'Guild not found' });

        db.saveVoiceWelcomeSettings(guildId, {
          enabled: body.enabled,
          mode: body.mode,
          log_channel_id: body.log_channel_id,
          tts_enabled: body.tts_enabled,
          welcome_message: body.welcome_message,
          leave_message: body.leave_message
        });

        return sendJson(res, 200, { success: true, message: 'Voice welcome settings saved' });
      }

      return sendJson(res, 404, { error: 'API route not found' });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    // --- Static File Serving from public/ ---
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') safePath = '/index.html';

    const filePath = path.join(publicDir, safePath);

    // Prevent directory traversal
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('File Not Found');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Web Dashboard] Port ${PORT} is in use; skipping web dashboard server.`);
    } else {
      console.error('[Web Dashboard Server Error]:', err.message);
    }
  });

  server.listen(PORT, () => {
    console.log(`🌐 Web Control Dashboard running at http://localhost:${PORT}`);
  });

  return server;
}

module.exports = startKeepAliveServer;
