const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Create, list, and inspect server structure snapshots and backups')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a full snapshot backup of all server channels, categories, and roles')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Name or note for this backup')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all saved backups for this server')
    )
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Inspect details of a specific backup snapshot')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('Backup ID to inspect')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a backup snapshot')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('Backup ID to delete')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'create') {
      await interaction.deferReply();
      const backupName = interaction.options.getString('name') || `Backup • ${new Date().toLocaleDateString()}`;
      const backupId = `bk-${Date.now().toString(36)}`;

      try {
        const rolesData = guild.roles.cache
          .filter(r => r.id !== guild.id && !r.managed)
          .map(r => ({
            id: r.id,
            name: r.name,
            color: r.color,
            hoist: r.hoist,
            position: r.position,
            permissions: r.permissions.bitfield.toString(),
            mentionable: r.mentionable
          }));

        const channelsData = guild.channels.cache.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          parentId: c.parentId,
          position: c.position,
          topic: c.topic || null,
          nsfw: c.nsfw || false,
          rateLimitPerUser: c.rateLimitPerUser || 0
        }));

        const snapshot = {
          guildId: guild.id,
          guildName: guild.name,
          createdAt: Date.now(),
          createdBy: interaction.user.tag,
          rolesCount: rolesData.length,
          channelsCount: channelsData.length,
          roles: rolesData,
          channels: channelsData
        };

        db.createBackup(backupId, guild.id, backupName, JSON.stringify(snapshot), interaction.user.tag);

        const embed = new EmbedBuilder()
          .setTitle('💾 Server Snapshot Backup Created')
          .setColor('#57F287')
          .setDescription(
            `A complete snapshot of **${guild.name}** has been captured and stored securely in SQLite.\n\n` +
            `• **Backup ID:** \`${backupId}\`\n` +
            `• **Backup Name:** ${backupName}\n` +
            `• **Captured Channels:** \`${channelsData.length}\` channels & categories\n` +
            `• **Captured Roles:** \`${rolesData.length}\` custom roles\n` +
            `• **Created By:** <@${interaction.user.id}>`
          )
          .setFooter({ text: 'Use /backup info or /backup list to manage snapshots' })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({
          embeds: [embeds.error(`Failed to create backup: ${err.message}`)]
        });
      }
    }

    if (sub === 'list') {
      const backups = db.getBackups(guild.id);
      if (backups.length === 0) {
        return interaction.reply({
          embeds: [embeds.info('No server snapshots found. Use `/backup create` to snapshot your server!')]
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`💾 Saved Backups • ${guild.name}`)
        .setColor(config.embedColor)
        .setDescription(
          backups.map((b, i) =>
            `**${i + 1}. \`${b.name}\`** (ID: \`${b.id}\`)\n` +
            `• Created: <t:${Math.floor(b.created_at / 1000)}:R> by \`${b.created_by || 'Admin'}\``
          ).join('\n\n')
        )
        .setFooter({ text: `Total Backups: ${backups.length} | Inspect with /backup info <id>` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'info') {
      const id = interaction.options.getString('id');
      const backup = db.getBackup(id);

      if (!backup || backup.guild_id !== guild.id) {
        return interaction.reply({
          embeds: [embeds.error(`Backup \`${id}\` not found for this server.`)],
          ephemeral: true
        });
      }

      const data = JSON.parse(backup.data_json);

      const embed = new EmbedBuilder()
        .setTitle(`💾 Backup Inspection • ${backup.name}`)
        .setColor('#5865F2')
        .setDescription(
          `• **ID:** \`${backup.id}\`\n` +
          `• **Original Server:** ${data.guildName}\n` +
          `• **Channels Stored:** \`${data.channelsCount || data.channels.length}\` (Text, Voice, Categories)\n` +
          `• **Roles Stored:** \`${data.rolesCount || data.roles.length}\` roles\n` +
          `• **Created:** <t:${Math.floor(backup.created_at / 1000)}:F>\n` +
          `• **Created By:** \`${backup.created_by || 'Staff'}\``
        )
        .setFooter({ text: 'Anti-Nuke Disaster Recovery' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'delete') {
      const id = interaction.options.getString('id');
      const backup = db.getBackup(id);

      if (!backup || backup.guild_id !== guild.id) {
        return interaction.reply({
          embeds: [embeds.error(`Backup \`${id}\` not found.`)],
          ephemeral: true
        });
      }

      db.deleteBackup(id);
      return interaction.reply({
        embeds: [embeds.success(`Deleted backup snapshot \`${id}\` (${backup.name}).`)]
      });
    }
  }
};
