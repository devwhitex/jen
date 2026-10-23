const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and Discord API response time'),

  async execute(interaction) {
    const sent = await interaction.deferReply({ fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiPing = Math.round(interaction.client.ws.ping);

    const embed = embeds.info(
      `📶 **Bot Latency:** \`${latency}ms\`\n` +
      `🌐 **Discord API Ping:** \`${apiPing}ms\``,
      'Pong!'
    );

    await interaction.editReply({ embeds: [embed] });
  }
};
