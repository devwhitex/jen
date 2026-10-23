const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a server improvement suggestion or idea')
    .addStringOption(opt =>
      opt.setName('idea')
        .setDescription('Your suggestion or proposal for the server')
        .setRequired(true)
    )
    .addAttachmentOption(opt =>
      opt.setName('screenshot')
        .setDescription('Optional proof or concept mockup image')
        .setRequired(false)
    ),

  async execute(interaction) {
    const settings = db.getSettings(interaction.guild.id);
    const channelId = settings.suggestion_channel_id;

    if (!channelId) {
      return interaction.reply({
        embeds: [embeds.error('Suggestions have not been configured on this server yet! Ask an admin to run `/suggestion-setup`.')],
        ephemeral: true
      });
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      return interaction.reply({
        embeds: [embeds.error('The configured suggestion channel could not be found.')],
        ephemeral: true
      });
    }

    const idea = interaction.options.getString('idea');
    const screenshot = interaction.options.getAttachment('screenshot');

    const tempEmbed = new EmbedBuilder()
      .setAuthor({
        name: `Suggestion by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      })
      .setDescription(idea)
      .setColor(config.embedColor)
      .addFields(
        { name: '📊 Status', value: '⏳ **Pending Staff Review**', inline: true },
        { name: '👍 Upvotes', value: '`0`', inline: true },
        { name: '👎 Downvotes', value: '`0`', inline: true }
      )
      .setFooter({ text: 'Suggestion ID: Generating...' })
      .setTimestamp();

    if (screenshot) {
      tempEmbed.setImage(screenshot.url);
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('suggest_upvote')
        .setLabel('Upvote (0)')
        .setEmoji('👍')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('suggest_downvote')
        .setLabel('Downvote (0)')
        .setEmoji('👎')
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await channel.send({
      embeds: [tempEmbed],
      components: [buttons]
    });

    const res = db.createSuggestion(
      interaction.guild.id,
      channel.id,
      msg.id,
      interaction.user.id,
      idea,
      screenshot ? screenshot.url : null
    );

    const suggestionId = res.lastInsertRowid;

    tempEmbed.setFooter({ text: `Suggestion ID: #${suggestionId}` });
    await msg.edit({ embeds: [tempEmbed] });

    return interaction.reply({
      embeds: [embeds.success(`Your suggestion has been submitted to ${channel}! (ID: **#${suggestionId}**)`)]
    });
  }
};
