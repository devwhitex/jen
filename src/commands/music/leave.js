const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../music/player');
const voiceService = require('../../services/voiceService');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Disconnect the bot from the voice channel'),

  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guild.id);
    const has247 = voiceService.is247Active(interaction.guild.id);
    const connection = queue?.connection || voiceService.connections.get(interaction.guild.id);

    if (!connection) {
      return interaction.reply({
        embeds: [embeds.error('I am not currently connected to any voice channel!')],
        ephemeral: true
      });
    }

    if (queue) queue.destroy();
    voiceService.disconnect247(interaction.guild.id);

    return interaction.reply({
      embeds: [embeds.success(`👋 Disconnected from voice channel.${has247 ? '\nℹ️ *24/7 Voice Stay Mode has been disabled for this guild.*' : ''}`)]
    });
  }
};
