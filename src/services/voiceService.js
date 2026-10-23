const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');
const https = require('https');
const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const config = require('../config');

class VoiceService {
  constructor() {
    // Active connections managed by 24/7 service (guildId -> VoiceConnection)
    this.connections = new Map();
    // Tracking member VC join times for duration calculation (guildId:memberId -> timestamp)
    this.joinTimes = new Map();
    // Reconnect attempt trackers to prevent rapid thrashing
    this.reconnectTimers = new Map();
  }

  /**
   * Initializes 24/7 Voice Channel connections for all guilds on bot startup
   */
  async init247(client) {
    console.log('🔄 Initializing 24/7 Voice Channels...');
    try {
      const records = db.getAllVoice247();
      for (const rec of records) {
        const guild = client.guilds.cache.get(rec.guild_id);
        if (!guild) continue;

        const channel = guild.channels.cache.get(rec.channel_id);
        if (!channel || !channel.isVoiceBased()) continue;

        try {
          await this.connect247(guild, channel, Boolean(rec.deafened));
          console.log(`🔊 [24/7 Voice] Joined "${channel.name}" in guild "${guild.name}"`);
        } catch (err) {
          console.error(`⚠️ [24/7 Voice] Failed to join "${channel.name}" in "${guild.name}":`, err.message);
        }
      }
    } catch (err) {
      console.error('⚠️ [24/7 Voice] Error in init247:', err.message);
    }
  }

  /**
   * Connects the bot to a voice channel with 24/7 stay and auto-reconnect
   */
  async connect247(guild, voiceChannel, selfDeaf = true) {
    if (!voiceChannel || !voiceChannel.isVoiceBased()) {
      throw new Error('Invalid voice channel provided');
    }

    // Cancel any pending reconnect timer
    if (this.reconnectTimers.has(guild.id)) {
      clearTimeout(this.reconnectTimers.get(guild.id));
      this.reconnectTimers.delete(guild.id);
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: selfDeaf,
      selfMute: false
    });

    this.connections.set(guild.id, connection);

    // Save to database
    db.saveVoice247(guild.id, voiceChannel.id, null, 1, selfDeaf ? 1 : 0);

    // Reconnection & lifecycle handlers
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
        ]);
        // Seems to be reconnecting to a new voice channel or recovered
      } catch (e) {
        // Disconnected permanently from current channel
        this.handleAutoReconnect(guild.id, voiceChannel.id, guild.client);
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.connections.delete(guild.id);
    });

    return connection;
  }

  /**
   * Handles automatic reconnection when disconnected from 24/7 voice channel
   */
  handleAutoReconnect(guildId, channelId, client) {
    if (!client) return;
    const settings = db.getVoice247(guildId);
    if (!settings || !settings.enabled) return;

    if (this.reconnectTimers.has(guildId)) return;

    console.log(`[24/7 Voice] Disconnected in guild ${guildId}. Reconnecting in 5 seconds...`);
    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(guildId);
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;

      const targetChannelId = settings.channel_id || channelId;
      const channel = guild.channels.cache.get(targetChannelId);
      if (channel && channel.isVoiceBased()) {
        try {
          await this.connect247(guild, channel, Boolean(settings.deafened));
          console.log(`[24/7 Voice] Reconnected to "${channel.name}" in "${guild.name}"!`);
        } catch (err) {
          console.error(`[24/7 Voice] Reconnection failed in "${guild.name}":`, err.message);
        }
      }
    }, 5000);

    this.reconnectTimers.set(guildId, timer);
  }

  /**
   * Disables 24/7 mode and disconnects from voice
   */
  disconnect247(guildId) {
    if (this.reconnectTimers.has(guildId)) {
      clearTimeout(this.reconnectTimers.get(guildId));
      this.reconnectTimers.delete(guildId);
    }

    db.disableVoice247(guildId);

    const connection = this.connections.get(guildId);
    if (connection) {
      try {
        connection.destroy();
      } catch (_) {}
      this.connections.delete(guildId);
    }
  }

  /**
   * Check if 24/7 mode is active
   */
  is247Active(guildId) {
    const settings = db.getVoice247(guildId);
    return Boolean(settings && settings.enabled);
  }

  /**
   * Formats millisecond duration into human-readable string
   */
  formatDuration(ms) {
    if (!ms || ms < 1000) return 'a few seconds';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
  }

  /**
   * Plays a TTS greeting or farewell audio stream in the voice channel
   */
  playTTS(guildId, text) {
    const connection = this.connections.get(guildId);
    if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) return;

    // Check if music is playing in this guild
    const musicManager = require('../music/player');
    const queue = musicManager.getQueue(guildId);
    if (queue && queue.currentSong) {
      // Don't interrupt playing music with TTS
      return;
    }

    try {
      const cleanText = text.replace(/[^a-zA-Z0-9 ,!?.']/g, '').slice(0, 100);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(cleanText)}`;

      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode !== 200) return;

        const resource = createAudioResource(res, { inlineVolume: true });
        if (resource.volume) resource.volume.setVolume(1.0);

        const player = createAudioPlayer();
        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
          player.stop();
        });
        player.on('error', () => {
          player.stop();
        });
      }).on('error', () => null);
    } catch (_) {}
  }

  /**
   * Processes voice state updates (Join, Leave, Move) for Welcome & Goodbye system
   */
  async handleVoiceStateUpdate(oldState, newState, client) {
    const member = newState.member || oldState.member;
    const guild = newState.guild || oldState.guild;
    if (!guild || !member) return;

    // 1. If it's the bot itself:
    if (member.id === client.user.id) {
      if (!newState.channelId && oldState.channelId) {
        // Bot was disconnected from voice
        this.handleAutoReconnect(guild.id, oldState.channelId, client);
      }
      return;
    }

    const settings = db.getVoiceWelcomeSettings(guild.id);
    if (!settings || !settings.enabled) return;

    const joinKey = `${guild.id}:${member.id}`;
    const userTag = member.user?.tag || member.displayName;
    const userAvatar = member.user?.displayAvatarURL({ dynamic: true }) || null;

    // ==========================================
    // CASE 1: Member JOINED a Voice Channel
    // ==========================================
    if (!oldState.channelId && newState.channelId) {
      this.joinTimes.set(joinKey, Date.now());
      const channel = newState.channel;
      if (!channel) return;

      const welcomeTemplate = settings.welcome_message || 'Welcome to {channel}, {user}! 👋';
      const welcomeText = welcomeTemplate
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{userName}/g, member.displayName)
        .replace(/{channel}/g, channel.name)
        .replace(/{members}/g, channel.members.size.toString())
        .replace(/{server}/g, guild.name);

      const embed = new EmbedBuilder()
        .setAuthor({ name: `${member.displayName} joined Voice`, iconURL: userAvatar })
        .setDescription(welcomeText)
        .addFields(
          { name: '🔊 Voice Channel', value: `<#${channel.id}>`, inline: true },
          { name: '👥 In Channel', value: `**${channel.members.size}** member${channel.members.size === 1 ? '' : 's'}`, inline: true }
        )
        .setColor('#10B981') // Emerald green
        .setThumbnail(userAvatar)
        .setTimestamp();

      await this.dispatchNotification(guild, settings, channel, embed);

      // Audio TTS greeting if member joined the bot's channel
      if (settings.tts_enabled) {
        const botChannelId = guild.members.me?.voice?.channelId;
        if (botChannelId && botChannelId === channel.id) {
          this.playTTS(guild.id, `Welcome, ${member.displayName}!`);
        }
      }
      return;
    }

    // ==========================================
    // CASE 2: Member LEFT a Voice Channel
    // ==========================================
    if (oldState.channelId && !newState.channelId) {
      const channel = oldState.channel;
      const joinedAt = this.joinTimes.get(joinKey);
      this.joinTimes.delete(joinKey);

      const durationMs = joinedAt ? Date.now() - joinedAt : null;
      const durationStr = durationMs ? this.formatDuration(durationMs) : 'Unknown';

      const leaveTemplate = settings.leave_message || '{user} left {channel}. Hope to see you soon! 👋';
      const leaveText = leaveTemplate
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{userName}/g, member.displayName)
        .replace(/{channel}/g, channel?.name || 'Voice')
        .replace(/{members}/g, (channel?.members.size || 0).toString())
        .replace(/{server}/g, guild.name);

      const embed = new EmbedBuilder()
        .setAuthor({ name: `${member.displayName} left Voice`, iconURL: userAvatar })
        .setDescription(leaveText)
        .addFields(
          { name: '🔊 Left Channel', value: channel ? `**${channel.name}**` : 'Voice Channel', inline: true },
          { name: '👥 Remaining', value: `**${channel?.members.size || 0}** member${channel?.members.size === 1 ? '' : 's'}`, inline: true },
          { name: '⏱️ Time in VC', value: `**${durationStr}**`, inline: true }
        )
        .setColor('#EF4444') // Crimson red
        .setThumbnail(userAvatar)
        .setTimestamp();

      await this.dispatchNotification(guild, settings, channel, embed);

      // Audio TTS farewell if member left the bot's channel
      if (settings.tts_enabled) {
        const botChannelId = guild.members.me?.voice?.channelId;
        if (botChannelId && botChannelId === channel?.id) {
          this.playTTS(guild.id, `Goodbye, ${member.displayName}!`);
        }
      }
      return;
    }

    // ==========================================
    // CASE 3: Member SWITCHED Voice Channels
    // ==========================================
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const oldChannel = oldState.channel;
      const newChannel = newState.channel;
      if (!oldChannel || !newChannel) return;

      const embed = new EmbedBuilder()
        .setAuthor({ name: `${member.displayName} switched channels`, iconURL: userAvatar })
        .setDescription(`**<@${member.id}>** moved from **${oldChannel.name}** to **${newChannel.name}**`)
        .addFields(
          { name: '📤 From', value: `**${oldChannel.name}** (${oldChannel.members.size})`, inline: true },
          { name: '📥 To', value: `<#${newChannel.id}> (${newChannel.members.size})`, inline: true }
        )
        .setColor('#6366F1') // Indigo
        .setThumbnail(userAvatar)
        .setTimestamp();

      await this.dispatchNotification(guild, settings, newChannel, embed);

      // TTS greeting in new channel if bot is there
      if (settings.tts_enabled) {
        const botChannelId = guild.members.me?.voice?.channelId;
        if (botChannelId && botChannelId === newChannel.id) {
          this.playTTS(guild.id, `Welcome, ${member.displayName}!`);
        }
      }
    }
  }

  /**
   * Helper to dispatch embeds based on configured delivery mode:
   * 'vc_chat', 'log_channel', or 'both'
   */
  async dispatchNotification(guild, settings, voiceChannel, embed) {
    const mode = settings.mode || 'vc_chat';

    // 1. Send directly into Voice Channel text chat
    if (mode === 'vc_chat' || mode === 'both') {
      if (voiceChannel && typeof voiceChannel.send === 'function') {
        voiceChannel.send({ embeds: [embed] }).catch(() => null);
      }
    }

    // 2. Send to dedicated Voice Log channel
    if (mode === 'log_channel' || mode === 'both') {
      if (settings.log_channel_id) {
        const logChannel = guild.channels.cache.get(settings.log_channel_id);
        if (logChannel && typeof logChannel.send === 'function') {
          logChannel.send({ embeds: [embed] }).catch(() => null);
        }
      }
    }
  }
}

const voiceService = new VoiceService();
module.exports = voiceService;
