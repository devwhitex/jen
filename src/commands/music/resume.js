const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../music/player');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume paused music playback'),

  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guild.id);
    if (!queue || !queue.currentSong) {
      return interaction.reply({
        embeds: [embeds.error('There is no music to resume!')],
        ephemeral: true
      });
    }

    queue.resume();
    return interaction.reply({
      embeds: [embeds.success('▶️ Music playback resumed!')]
    });
  }
};
