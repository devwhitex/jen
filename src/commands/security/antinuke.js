const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Configure and monitor the Anti-Nuke Server Defender system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View current Anti-Nuke protection status, thresholds, and recent alerts')
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable the Anti-Nuke Defender')
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('Enable or disable protection')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setlimit')
        .setDescription('Configure threshold rate limits (per 10 seconds)')
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('Which limit to configure')
            .setRequired(true)
            .addChoices(
              { name: 'Channel Deletions', value: 'max_channel_deletes' },
              { name: 'Channel Creations', value: 'max_channel_creates' },
              { name: 'Member Bans & Kicks', value: 'max_ban_kicks' },
              { name: 'Role Deletions', value: 'max_role_deletes' }
            )
        )
        .addIntegerOption(opt =>
          opt.setName('limit')
            .setDescription('Max actions allowed in 10 seconds (1-10)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10)
        )
    )
    .addSubcommand(sub =>
      sub.setName('punishment')
        .setDescription('Choose action taken when rate limits are breached')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('Punishment type')
            .setRequired(true)
            .addChoices(
              { name: 'Ban Offender', value: 'ban' },
              { name: 'Kick Offender', value: 'kick' },
              { name: 'Strip Admin & Mod Roles', value: 'strip_roles' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('logchannel')
        .setDescription('Set the channel for emergency security alerts')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Text channel for security logs')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommandGroup(group =>
      group.setName('whitelist')
        .setDescription('Manage trusted admins exempt from Anti-Nuke limits')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a trusted admin to the whitelist')
            .addUserOption(opt => opt.setName('user').setDescription('User to whitelist').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a user from the whitelist')
            .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('List all currently whitelisted users')
        )
    )
    .addSubcommand(sub =>
      sub.setName('logs')
        .setDescription('View recent Anti-Nuke security interception logs')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup();
    const guildId = interaction.guild.id;

    // --- Whitelist Subcommands ---
    if (group === 'whitelist') {
      if (sub === 'add') {
        const user = interaction.options.getUser('user');
        db.addAntiNukeWhitelist(guildId, user.id, interaction.user.tag);
        return interaction.reply({
          embeds: [embeds.success(`🛡️ <@${user.id}> (\`${user.tag}\`) has been added to the **Anti-Nuke Whitelist**.`)]
        });
      }

      if (sub === 'remove') {
        const user = interaction.options.getUser('user');
        db.removeAntiNukeWhitelist(guildId, user.id);
        return interaction.reply({
          embeds: [embeds.info(`🛡️ <@${user.id}> has been removed from the Anti-Nuke Whitelist.`)]
        });
      }

      if (sub === 'list') {
        const list = db.getAntiNukeWhitelist(guildId);
        if (list.length === 0) {
          return interaction.reply({
            embeds: [embeds.info('No users are currently whitelisted. (Note: Server Owner and the Bot are exempt by default).')]
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('🛡️ Anti-Nuke Whitelisted Administrators')
          .setColor(config.embedColor)
          .setDescription(
            list.map((u, i) => `${i + 1}. <@${u.user_id}> (\`${u.user_id}\`) • Added by ${u.added_by || 'Admin'}`).join('\n')
          )
          .setFooter({ text: `Total Whitelisted: ${list.length}` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }
    }

    // --- Toggle ---
    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      db.updateAntiNukeSetting(guildId, 'enabled', enabled ? 1 : 0);
      return interaction.reply({
        embeds: [
          enabled
            ? embeds.success('🛡️ **Anti-Nuke Defender is now ENABLED!** Server is actively protected against channel wipes, mass bans, and rogue raids.')
            : embeds.warn('⚠️ **Anti-Nuke Defender is now DISABLED.** Protection against rapid mass administrative actions is paused.')
        ]
      });
    }

    // --- Set Limit ---
    if (sub === 'setlimit') {
      const category = interaction.options.getString('category');
      const limit = interaction.options.getInteger('limit');
      db.updateAntiNukeSetting(guildId, category, limit);

      return interaction.reply({
        embeds: [embeds.success(`🛡️ Updated \`${category}\` threshold limit to **${limit} actions** per 10 seconds.`)]
      });
    }

    // --- Punishment ---
    if (sub === 'punishment') {
      const action = interaction.options.getString('action');
      db.updateAntiNukeSetting(guildId, 'punishment', action);

      return interaction.reply({
        embeds: [embeds.success(`🛡️ Anti-Nuke breach punishment set to: **${action.toUpperCase()}**`)]
      });
    }

    // --- Log Channel ---
    if (sub === 'logchannel') {
      const channel = interaction.options.getChannel('channel');
      db.updateAntiNukeSetting(guildId, 'log_channel_id', channel.id);

      return interaction.reply({
        embeds: [embeds.success(`🛡️ Anti-Nuke emergency alert log channel set to ${channel}!`)]
      });
    }

    // --- Logs ---
    if (sub === 'logs') {
      const logs = db.getAntiNukeLogs(guildId, 10);
      if (logs.length === 0) {
        return interaction.reply({
          embeds: [embeds.success('🛡️ No security incidents or nuke attempts recorded! Server is clean and safe.')]
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('🛡️ Recent Anti-Nuke Security Incidents')
        .setColor('#ED4245')
        .setDescription(
          logs.map(log => 
            `**#${log.id} • ${log.action_type}** (<t:${Math.floor(log.timestamp / 1000)}:R>)\n` +
            `• **Offender:** <@${log.executor_id}> (\`${log.executor_id}\`)\n` +
            `• **Action Taken:** \`${log.punishment_taken}\`\n` +
            `• **Reason:** ${log.reason}`
          ).join('\n\n')
        )
        .setFooter({ text: 'Anti-Nuke Incident Log' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // --- Status ---
    if (sub === 'status') {
      const settings = db.getAntiNukeSettings(guildId);
      const whitelist = db.getAntiNukeWhitelist(guildId);
      const logs = db.getAntiNukeLogs(guildId, 1);

      const statusEmbed = new EmbedBuilder()
        .setTitle('🛡️ Anti-Nuke Server Defender • Status Hub')
        .setColor(settings.enabled ? '#57F287' : '#ED4245')
        .setDescription(
          `**Protection System:** ${settings.enabled ? '🟢 **ONLINE & ACTIVE**' : '🔴 **DISABLED**'}\n` +
          `**Punishment on Breach:** \`${(settings.punishment || 'ban').toUpperCase()}\`\n` +
          `**Alert Channel:** ${settings.log_channel_id ? `<#${settings.log_channel_id}>` : '`Not configured`'}\n` +
          `**Whitelisted Admins:** \`${whitelist.length} users exempt\`\n\n` +
          `### ⏱️ Action Rate Limits (Trigger Window: 10s)\n` +
          `• 📁 **Channel Deletions:** Max \`${settings.max_channel_deletes || 3}\` in 10s\n` +
          `• 📂 **Channel Creations:** Max \`${settings.max_channel_creates || 4}\` in 10s\n` +
          `• 🔨 **Bans & Kicks:** Max \`${settings.max_ban_kicks || 3}\` in 10s\n` +
          `• 🎭 **Role Deletions:** Max \`${settings.max_role_deletes || 3}\` in 10s\n` +
          `• 🤖 **Rogue Bot Injections:** Instant Quarantine (\`Limit: 1\`)`
        )
        .addFields(
          {
            name: '🚨 Last Intercepted Incident',
            value: logs.length > 0
              ? `**${logs[0].action_type}** by <@${logs[0].executor_id}> (<t:${Math.floor(logs[0].timestamp / 1000)}:R>)\nAction: \`${logs[0].punishment_taken}\``
              : '✅ No incidents detected. Server secure.',
            inline: false
          }
        )
        .setFooter({ text: 'Anti-Nuke Security Shield • 24/7 Protection' })
        .setTimestamp();

      return interaction.reply({ embeds: [statusEmbed] });
    }
  }
};
