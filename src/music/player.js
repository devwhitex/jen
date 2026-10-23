const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');
const { Ytdl } = require('@distube/ytdl-core');
const yts = require('yt-search');
const config = require('../config');
const db = require('../database/db');

// Initialize Ytdl instance
const ytdl = new Ytdl();

class GuildQueue {
  constructor(client, guildId) {
    this.client = client;
    this.guildId = guildId;
    this.voiceChannel = null;
    this.textChannel = null;
    this.connection = null;
    this.player = createAudioPlayer();
    this.songs = [];
    this.currentSong = null;
    this.volume = 100;
    this.loop = 'off'; // 'off', 'track', 'queue'
    this.nowPlayingMessage = null;
    this.disconnectTimeout = null;

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.handleSongEnd();
    });

    this.player.on('error', (error) => {
      console.error(`Audio player error in guild ${this.guildId}:`, error.message);
      if (this.textChannel) {
        this.textChannel.send(`⚠️ Error playing track: ${error.message}`).catch(() => null);
      }
      this.handleSongEnd();
    });
  }

  async handleSongEnd() {
    if (this.loop === 'track' && this.currentSong) {
      await this.playTrack(this.currentSong);
      return;
    }

    if (this.loop === 'queue' && this.currentSong) {
      this.songs.push(this.currentSong);
    }

    if (this.songs.length > 0) {
      const nextSong = this.songs.shift();
      await this.playTrack(nextSong);
    } else {
      this.currentSong = null;
      const v247 = db.getVoice247(this.guildId);
      if (v247 && v247.enabled) {
        if (this.textChannel) {
          this.textChannel.send('🎵 **Queue ended.** Bot will remain connected (24/7 Voice Stay Mode is active).').catch(() => null);
        }
        return;
      }
      if (this.textChannel) {
        this.textChannel.send('🎵 **Queue ended.** Bot will leave the voice channel in 2 minutes if no new songs are added.').catch(() => null);
      }
      this.scheduleDisconnect();
    }
  }

  scheduleDisconnect() {
    if (this.disconnectTimeout) clearTimeout(this.disconnectTimeout);
    const v247 = db.getVoice247(this.guildId);
    if (v247 && v247.enabled) return;

    this.disconnectTimeout = setTimeout(() => {
      const check247 = db.getVoice247(this.guildId);
      if (check247 && check247.enabled) return;

      if (!this.currentSong && this.songs.length === 0) {
        this.destroy();
      }
    }, 120000);
  }

  cancelDisconnect() {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
  }

  async connect(voiceChannel, textChannel = null) {
    this.voiceChannel = voiceChannel;
    if (textChannel) this.textChannel = textChannel;
    this.cancelDisconnect();

    if (!this.connection || this.connection.state.status === VoiceConnectionStatus.Destroyed) {
      this.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true
      });

      // Register connection in voiceService
      try {
        const voiceService = require('../services/voiceService');
        voiceService.connections.set(voiceChannel.guild.id, this.connection);
      } catch (_) {}

      this.connection.subscribe(this.player);

      this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000)
          ]);
        } catch (error) {
          this.destroy();
        }
      });
    }

    return this.connection;
  }

  async playTrack(song) {
    this.currentSong = song;
    this.cancelDisconnect();

    try {
      // Create audio stream using modern Ytdl
      const stream = ytdl.download(song.url, {
        filter: { hasAudio: true, hasVideo: false },
        highWaterMark: 1 << 25
      });

      const resource = createAudioResource(stream, {
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(this.volume / 100);
      }

      this.player.play(resource);

      const embed = new EmbedBuilder()
        .setTitle('🎶 Now Playing')
        .setDescription(`[**${song.title}**](${song.url})`)
        .addFields(
          { name: '⏱️ Duration', value: song.duration || 'Live / Unknown', inline: true },
          { name: '👤 Requested By', value: `<@${song.requester.id}>`, inline: true },
          { name: '🔊 Volume', value: `${this.volume}%`, inline: true }
        )
        .setThumbnail(song.thumbnail || null)
        .setColor(config.embedColor)
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('music_toggle')
          .setEmoji('⏯️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_skip')
          .setEmoji('⏭️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_stop')
          .setEmoji('⏹️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('music_queue')
          .setEmoji('📜')
          .setStyle(ButtonStyle.Primary)
      );

      if (this.textChannel) {
        this.nowPlayingMessage = await this.textChannel.send({
          embeds: [embed],
          components: [buttons]
        }).catch(() => null);
      }
    } catch (err) {
      console.error(`Error playing track in guild ${this.guildId}:`, err);
      if (this.textChannel) {
        this.textChannel.send(`❌ Could not play track **${song.title}**: \`${err.message}\``).catch(() => null);
      }
      this.handleSongEnd();
    }
  }

  pause() {
    return this.player.pause();
  }

  resume() {
    return this.player.unpause();
  }

  skip() {
    this.player.stop();
  }

  stop(forceLeave = false) {
    this.songs = [];
    this.currentSong = null;
    this.player.stop();
    const v247 = db.getVoice247(this.guildId);
    if (!forceLeave && v247 && v247.enabled) {
      return;
    }
    this.destroy();
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(150, vol));
    if (this.player.state.resource?.volume) {
      this.player.state.resource.volume.setVolume(this.volume / 100);
    }
    return this.volume;
  }

  destroy() {
    this.cancelDisconnect();
    this.songs = [];
    this.currentSong = null;
    if (this.player) {
      this.player.stop();
    }
    if (this.connection) {
      try {
        this.connection.destroy();
      } catch (_) {}
      this.connection = null;
    }
    musicManager.deleteQueue(this.guildId);
  }
}

class MusicManager {
  constructor() {
    this.queues = new Map();
  }

  getQueue(guildId) {
    return this.queues.get(guildId);
  }

  createQueue(client, guildId) {
    let queue = this.queues.get(guildId);
    if (!queue) {
      queue = new GuildQueue(client, guildId);
      this.queues.set(guildId, queue);
    }
    return queue;
  }

  deleteQueue(guildId) {
    this.queues.delete(guildId);
  }

  async search(query) {
    try {
      // 1. Check if direct YouTube URL
      if (query.includes('youtube.com/watch') || query.includes('youtu.be/')) {
        const info = await ytdl.getInfo(query);
        return [{
          title: info.videoDetails.title,
          url: info.videoDetails.video_url || query,
          duration: `${Math.floor(info.videoDetails.lengthSeconds / 60)}:${(info.videoDetails.lengthSeconds % 60).toString().padStart(2, '0')}`,
          thumbnail: info.videoDetails.thumbnails?.[0]?.url
        }];
      }
    } catch (_) {}

    // 2. Fast search by song name / keywords
    try {
      const searchRes = await yts(query);
      if (searchRes && searchRes.videos.length > 0) {
        const v = searchRes.videos[0];
        return [{
          title: v.title,
          url: v.url,
          duration: v.timestamp,
          thumbnail: v.thumbnail
        }];
      }
    } catch (err) {
      console.error('Search error:', err.message);
    }

    return [];
  }
}

const musicManager = new MusicManager();
module.exports = musicManager;
