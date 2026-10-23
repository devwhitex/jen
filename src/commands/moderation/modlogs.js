const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlog-setup')
    .setDescription('Set or disable the channel for moderation action logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel where mod actions (warns, kicks, bans, timeouts) will be posted')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('disable')
        .setDescription('Set to true to disable mod logging')
        .setRequired(false)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const disable = interaction.options.getBoolean('disable');

    if (disable) {
      db.updateSetting(interaction.guild.id, 'mod_log_channel_id', null);
      return interaction.reply({
        embeds: [embeds.success('Moderation logging has been disabled.')]
      });
    }

    if (channel) {
      db.updateSetting(interaction.guild.id, 'mod_log_channel_id', channel.id);
      return interaction.reply({
        embeds: [embeds.success(`Moderation logs will now be sent to ${channel}!`)]
      });
    }

    const current = db.getSettings(interaction.guild.id);
    return interaction.reply({
      embeds: [
        embeds.info(
          `Current Mod Log Channel: ${current.mod_log_channel_id ? `<#${current.mod_log_channel_id}>` : 'Not configured'}`
        )
      ],
      ephemeral: true
    });
  }
};
