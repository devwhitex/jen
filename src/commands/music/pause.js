const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../music/player');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current music playback'),

  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guild.id);
    if (!queue || !queue.currentSong) {
      return interaction.reply({
        embeds: [embeds.error('There is no music currently playing!')],
        ephemeral: true
      });
    }

    queue.pause();
    return interaction.reply({
      embeds: [embeds.info('⏸️ Music has been paused. Use `/resume` to continue.')]
    });
  }
};
