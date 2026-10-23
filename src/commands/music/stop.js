const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../music/player');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music playback, clear queue, and leave voice channel'),

  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({
        embeds: [embeds.error('There is no active music session to stop!')],
        ephemeral: true
      });
    }

    queue.stop();
    return interaction.reply({
      embeds: [embeds.success('⏹️ Playback stopped, queue cleared, and disconnected from voice channel.')]
    });
  }
};
