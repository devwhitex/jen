require('dotenv').config();

module.exports = {
  // Discord Bot Credentials
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '', // Optional: if provided, slash commands register instantly to this server

  // Bot Customization
  defaultPrefix: process.env.DEFAULT_PREFIX || '!',
  embedColor: process.env.EMBED_COLOR || '#5865F2', // Discord Blurple
  successColor: '#57F287', // Green
  warningColor: '#FEE75C', // Yellow
  errorColor: '#ED4245',   // Red
  infoColor: '#5865F2',    // Blurple
  maintenanceColor: '#FFA500', // Orange

  // Emojis for rich UI
  emojis: {
    ticket: '🎫',
    lock: '🔒',
    unlock: '🔓',
    trash: '🗑️',
    music: '🎵',
    play: '▶️',
    pause: '⏸️',
    skip: '⏭️',
    stop: '⏹️',
    queue: '📜',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    giveaway: '🎉',
    moderation: '🛡️',
    welcome: '👋',
    maintenance: '🔧',
    announcement: '📢',
    stats: '📊'
  }
};
