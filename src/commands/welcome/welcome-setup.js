const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome-setup')
    .setDescription('Configure welcome greeting channel, auto-role, and leave messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('welcome-channel')
        .setDescription('Channel where welcome messages will be sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addRoleOption(opt =>
      opt.setName('auto-role')
        .setDescription('Role automatically given to members when they join')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('welcome-message')
        .setDescription('Message template. Placeholders: {user}, {server}, {members}')
        .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('leave-channel')
        .setDescription('Channel where goodbye messages will be sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('leave-message')
        .setDescription('Message template for leaves. Placeholders: {userTag}, {server}, {members}')
        .setRequired(false)
    ),

  async execute(interaction) {
    const welcomeChannel = interaction.options.getChannel('welcome-channel');
    const autoRole = interaction.options.getRole('auto-role');
    const welcomeMsg = interaction.options.getString('welcome-message');
    const leaveChannel = interaction.options.getChannel('leave-channel');
    const leaveMsg = interaction.options.getString('leave-message');

    const updates = [];

    if (welcomeChannel) {
      db.updateSetting(interaction.guild.id, 'welcome_channel_id', welcomeChannel.id);
      updates.push(`• **Welcome Channel:** ${welcomeChannel}`);
    }
    if (autoRole) {
      db.updateSetting(interaction.guild.id, 'welcome_role_id', autoRole.id);
      updates.push(`• **Auto-Role:** ${autoRole}`);
    }
    if (welcomeMsg) {
      db.updateSetting(interaction.guild.id, 'welcome_message', welcomeMsg);
      updates.push(`• **Welcome Message:** "${welcomeMsg}"`);
    }
    if (leaveChannel) {
      db.updateSetting(interaction.guild.id, 'leave_channel_id', leaveChannel.id);
      updates.push(`• **Leave Channel:** ${leaveChannel}`);
    }
    if (leaveMsg) {
      db.updateSetting(interaction.guild.id, 'leave_message', leaveMsg);
      updates.push(`• **Leave Message:** "${leaveMsg}"`);
    }

    if (updates.length === 0) {
      const current = db.getSettings(interaction.guild.id);
      return interaction.reply({
        embeds: [
          embeds.info(
            `**Current Welcome Configuration:**\n\n` +
            `• **Welcome Channel:** ${current.welcome_channel_id ? `<#${current.welcome_channel_id}>` : 'Not set'}\n` +
            `• **Auto Role:** ${current.welcome_role_id ? `<@&${current.welcome_role_id}>` : 'Not set'}\n` +
            `• **Welcome Msg:** ${current.welcome_message}\n` +
            `• **Leave Channel:** ${current.leave_channel_id ? `<#${current.leave_channel_id}>` : 'Not set'}\n` +
            `• **Leave Msg:** ${current.leave_message}`,
            'Welcome Settings'
          )
        ],
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [
        embeds.success(
          `Welcome configuration successfully updated!\n\n${updates.join('\n')}`,
          'Welcome Settings Updated'
        )
      ]
    });
  }
};
