const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const os = require('os');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Display information about the bot system, host stats, and uptime'),

  async execute(interaction) {
    const uptimeSec = Math.floor(process.uptime());
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = uptimeSec % 60;
    const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024);
    const usedMemoryMB = totalMemoryMB - freeMemoryMB;
    const procMemMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    const guildsCount = interaction.client.guilds.cache.size;
    const usersCount = interaction.client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

    const embed = new EmbedBuilder()
      .setTitle('🤖 Server Maintainer Bot • System Status')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setColor(config.embedColor)
      .addFields(
        { name: '👑 Bot Name', value: interaction.client.user.tag, inline: true },
        { name: '⏱️ Uptime', value: uptimeStr, inline: true },
        { name: '🌐 Servers', value: `${guildsCount} guilds`, inline: true },
        { name: '👥 Total Users', value: `${usersCount} members`, inline: true },
        { name: '⚙️ Node.js', value: process.version, inline: true },
        { name: '📦 Discord.js', value: `v${djsVersion}`, inline: true },
        { name: '💾 RAM Usage', value: `${procMemMB} MB (Heap) / ${usedMemoryMB} MB (System)`, inline: true },
        { name: '🖥️ Platform', value: `${os.type()} ${os.arch()}`, inline: true }
      )
      .setFooter({ text: 'All systems operational' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
