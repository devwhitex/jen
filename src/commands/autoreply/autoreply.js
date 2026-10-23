const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoreply')
    .setDescription('Manage automatic trigger responses and chat replies')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Create a new auto-reply trigger')
        .addStringOption(opt =>
          opt.setName('trigger')
            .setDescription('Keyword or phrase to listen for')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('response')
            .setDescription('The automated message to reply with')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('match-type')
            .setDescription('How the bot should match the message')
            .addChoices(
              { name: 'Contains (word appears anywhere in message)', value: 'contains' },
              { name: 'Exact Match (entire message equals trigger)', value: 'exact' },
              { name: 'Starts With (message begins with trigger)', value: 'startswith' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Delete an auto-reply trigger by its ID')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('ID of the auto-reply to delete')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all active auto-replies configured in this server')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const trigger = interaction.options.getString('trigger');
      const response = interaction.options.getString('response');
      const matchType = interaction.options.getString('match-type') || 'contains';

      db.addAutoReply(interaction.guild.id, trigger, response, matchType, interaction.user.id);

      return interaction.reply({
        embeds: [
          embeds.success(
            `Successfully created auto-reply trigger!\n\n` +
            `• **Trigger:** \`${trigger}\`\n` +
            `• **Match Mode:** \`${matchType}\`\n` +
            `• **Response:** ${response}`
          )
        ]
      });
    }

    if (sub === 'remove') {
      const id = interaction.options.getInteger('id');
      const res = db.deleteAutoReply(id, interaction.guild.id);

      if (res.changes === 0) {
        return interaction.reply({
          embeds: [embeds.error(`No auto-reply found with ID #${id}`)],
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [embeds.success(`Deleted auto-reply #${id}`)]
      });
    }

    if (sub === 'list') {
      const list = db.getAutoReplies(interaction.guild.id);

      if (list.length === 0) {
        return interaction.reply({
          embeds: [embeds.info('No custom auto-replies set up yet. Use `/autoreply add` to create one!')]
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`💬 Auto-Replies for ${interaction.guild.name}`)
        .setColor(config.embedColor)
        .setDescription(
          list.map(item =>
            `**#${item.id}** [${item.match_type.toUpperCase()}]\n` +
            `• **Trigger:** \`${item.trigger}\`\n` +
            `• **Response:** ${item.reply.slice(0, 100)}${item.reply.length > 100 ? '...' : ''}`
          ).join('\n\n')
        )
        .setFooter({ text: `Total Auto-Replies: ${list.length}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};
