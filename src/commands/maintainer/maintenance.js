const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const MaintenanceManager = require('../../services/maintenanceManager');
const embeds = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Manage server maintenance mode and lockdowns')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Toggle maintenance mode on or off')
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('True to activate maintenance, False to deactivate')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('Custom notice message to display during maintenance')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Check current maintenance status')
    )
    .addSubcommand(sub =>
      sub.setName('lockdown')
        .setDescription('Lock or unlock the current channel for regular members')
        .addBooleanOption(opt =>
          opt.setName('lock')
            .setDescription('True to lock channel, False to unlock')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      const customMsg = interaction.options.getString('message');

      await MaintenanceManager.setMaintenance(interaction.guild, enabled, customMsg);

      const embed = new EmbedBuilder()
        .setTitle(`🔧 Maintenance Mode ${enabled ? 'ACTIVATED' : 'DEACTIVATED'}`)
        .setDescription(
          enabled
            ? `Server is now marked under **Maintenance**.\n\n` +
              `**Notice:** ${customMsg || MaintenanceManager.getMaintenanceMessage(interaction.guild.id)}\n\n` +
              `*Users will receive a maintenance reminder if automod or triggers engage.*`
            : `Server maintenance has concluded. All operations are running normally.`
        )
        .setColor(enabled ? config.maintenanceColor : config.successColor)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const isEnabled = MaintenanceManager.isUnderMaintenance(interaction.guild.id);
      const notice = MaintenanceManager.getMaintenanceMessage(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setTitle('🔧 Maintenance Status')
        .addFields(
          { name: 'Status', value: isEnabled ? '🔴 **Active**' : '🟢 **Inactive**', inline: true },
          { name: 'Notice Message', value: notice, inline: false }
        )
        .setColor(isEnabled ? config.maintenanceColor : config.successColor)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'lockdown') {
      const lock = interaction.options.getBoolean('lock');
      const channel = interaction.channel;

      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: !lock
      });

      return interaction.reply({
        embeds: [
          lock
            ? embeds.warning(`🔒 Channel ${channel} has been **LOCKED**. Regular members cannot send messages.`)
            : embeds.success(`🔓 Channel ${channel} has been **UNLOCKED**. Regular members can send messages.`)
        ]
      });
    }
  }
};
