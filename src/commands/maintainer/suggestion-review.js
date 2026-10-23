const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggestion-review')
    .setDescription('Approve, reject, or mark a suggestion as implemented')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt =>
      opt.setName('id')
        .setDescription('ID of the suggestion (e.g. 1, 2)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('status')
        .setDescription('New status for this suggestion')
        .addChoices(
          { name: '✅ Approved', value: 'approved' },
          { name: '❌ Denied / Rejected', value: 'rejected' },
          { name: '🚀 Implemented in Server', value: 'implemented' }
        )
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('comment')
        .setDescription('Staff explanation or feedback')
        .setRequired(false)
    ),

  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const status = interaction.options.getString('status');
    const comment = interaction.options.getString('comment') || 'No staff comment provided.';

    const suggestion = db.getSuggestion(id, interaction.guild.id);
    if (!suggestion) {
      return interaction.reply({
        embeds: [embeds.error(`Suggestion #${id} was not found!`)],
        ephemeral: true
      });
    }

    db.reviewSuggestion(id, interaction.guild.id, status, comment, interaction.user.id);

    // Update message in channel
    try {
      const channel = interaction.guild.channels.cache.get(suggestion.channel_id);
      if (channel) {
        const msg = await channel.messages.fetch(suggestion.message_id).catch(() => null);
        if (msg) {
          const authorUser = await interaction.client.users.fetch(suggestion.user_id).catch(() => null);

          let statusBadge = '⏳ **Pending Staff Review**';
          let color = config.embedColor;

          if (status === 'approved') {
            statusBadge = '✅ **Approved by Staff**';
            color = config.successColor;
          } else if (status === 'rejected') {
            statusBadge = '❌ **Denied by Staff**';
            color = config.errorColor;
          } else if (status === 'implemented') {
            statusBadge = '🚀 **Implemented in Server**';
            color = '#9B59B6';
          }

          const updatedEmbed = new EmbedBuilder()
            .setAuthor({
              name: `Suggestion by ${authorUser?.tag || 'User'}`,
              iconURL: authorUser?.displayAvatarURL({ dynamic: true })
            })
            .setDescription(suggestion.content)
            .setColor(color)
            .addFields(
              { name: '📊 Status', value: statusBadge, inline: false },
              { name: '💬 Staff Feedback', value: `"${comment}" — <@${interaction.user.id}>`, inline: false },
              { name: '👍 Upvotes', value: `\`${suggestion.upvotes.length}\``, inline: true },
              { name: '👎 Downvotes', value: `\`${suggestion.downvotes.length}\``, inline: true }
            )
            .setFooter({ text: `Suggestion ID: #${suggestion.id}` })
            .setTimestamp(new Date(suggestion.created_at));

          if (suggestion.image_url) {
            updatedEmbed.setImage(suggestion.image_url);
          }

          await msg.edit({ embeds: [updatedEmbed] });
        }
      }
    } catch (e) {
      console.warn('Could not update suggestion message:', e.message);
    }

    return interaction.reply({
      embeds: [embeds.success(`Suggestion #${id} updated to **${status.toUpperCase()}**!`)]
    });
  }
};
