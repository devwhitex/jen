const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome-test')
    .setDescription('Simulate and preview the welcome message in the configured channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const settings = db.getSettings(interaction.guild.id);
    const channelId = settings.welcome_channel_id;

    if (!channelId) {
      return interaction.reply({
        embeds: [embeds.error('No welcome channel is configured! Use `/welcome-setup` first.')],
        ephemeral: true
      });
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      return interaction.reply({
        embeds: [embeds.error(`The configured welcome channel (<#${channelId}>) could not be found.`)],
        ephemeral: true
      });
    }

    const welcomeText = (settings.welcome_message || 'Welcome to {server}, {user}!')
      .replace('{user}', `<@${interaction.user.id}>`)
      .replace('{server}', interaction.guild.name)
      .replace('{members}', interaction.guild.memberCount.toString());

    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`👋 Welcome to ${interaction.guild.name}!`)
      .setDescription(welcomeText)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setColor(config.embedColor)
      .setFooter({ text: `Member #${interaction.guild.memberCount}` })
      .setTimestamp();

    await channel.send({
      content: `Welcome <@${interaction.user.id}>! (Test Simulation)`,
      embeds: [welcomeEmbed]
    });

    return interaction.reply({
      embeds: [embeds.success(`Test welcome message sent to ${channel}!`)],
      ephemeral: true
    });
  }
};
