const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const musicManager = require('../../music/player');
const embeds = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Display the current music queue'),

  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guild.id);
    if (!queue || (!queue.currentSong && queue.songs.length === 0)) {
      return interaction.reply({
        embeds: [embeds.info('The music queue is currently empty!')],
        ephemeral: true
      });
    }

    const current = queue.currentSong;
    let description = `**🎶 Currently Playing:**\n[${current.title}](${current.url}) | \`${current.duration}\` (Requested by <@${current.requester.id}>)\n\n`;

    if (queue.songs.length > 0) {
      description += `**📜 Up Next (${queue.songs.length} tracks):**\n`;
      const tracksToShow = queue.songs.slice(0, 10);
      tracksToShow.forEach((track, index) => {
        description += `\`${index + 1}.\` [${track.title}](${track.url}) | \`${track.duration}\`\n`;
      });

      if (queue.songs.length > 10) {
        description += `\n*...and ${queue.songs.length - 10} more songs in queue.*`;
      }
    } else {
      description += `*No songs waiting in queue. Use \`/play\` to add more!*`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎵 Music Queue for ${interaction.guild.name}`)
      .setDescription(description)
      .setColor(config.embedColor)
      .setFooter({ text: `Volume: ${queue.volume}% • Repeat: ${queue.loop}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
