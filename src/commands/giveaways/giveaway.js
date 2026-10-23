const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

function parseDuration(str) {
  const match = str.match(/^(\d+)\s*(s|m|h|d|w)?$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    case 'w': return num * 7 * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Host and manage server giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(opt =>
          opt.setName('prize')
            .setDescription('The prize being given away')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('duration')
            .setDescription('Duration (e.g., 30s, 10m, 2h, 1d)')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('winners')
            .setDescription('Number of winners (default: 1)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to host the giveaway in (default: current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('Immediately end an active giveaway and pick winner(s)')
        .addStringOption(opt =>
          opt.setName('message-id')
            .setDescription('Message ID of the giveaway')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reroll')
        .setDescription('Reroll a new winner from an ended giveaway')
        .addStringOption(opt =>
          opt.setName('message-id')
            .setDescription('Message ID of the giveaway')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const giveawayManager = interaction.client.giveawayManager;

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const durationStr = interaction.options.getString('duration');
      const winnersCount = interaction.options.getInteger('winners') || 1;
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

      const durationMs = parseDuration(durationStr);
      if (!durationMs || durationMs < 5000) {
        return interaction.reply({
          embeds: [embeds.error('Invalid duration! Examples: `10m`, `1h`, `2d`. Minimum is 5 seconds.')],
          ephemeral: true
        });
      }

      const endsAt = Date.now() + durationMs;

      // Dummy object to render initial embed and button
      const tempGw = {
        prize,
        winners_count: winnersCount,
        ends_at: endsAt,
        hosted_by: interaction.user.id,
        entries: []
      };

      const embed = giveawayManager.buildGiveawayEmbed(tempGw);
      const buttonRow = giveawayManager.buildGiveawayButton({ message_id: 'temp', entries: [] });

      const msg = await targetChannel.send({
        embeds: [embed],
        components: [buttonRow]
      });

      // Update button customId with real message ID
      const realButtonRow = giveawayManager.buildGiveawayButton({ message_id: msg.id, entries: [] });
      await msg.edit({ components: [realButtonRow] });

      // Save into DB
      db.createGiveaway(msg.id, targetChannel.id, interaction.guild.id, prize, winnersCount, endsAt, interaction.user.id);

      return interaction.reply({
        embeds: [
          embeds.success(`Giveaway started in ${targetChannel}!\n• **Prize:** ${prize}\n• **Winners:** ${winnersCount}`)
        ],
        ephemeral: true
      });
    }

    if (sub === 'end') {
      const messageId = interaction.options.getString('message-id');
      const gw = db.getGiveaway(messageId);

      if (!gw) {
        return interaction.reply({
          embeds: [embeds.error('Giveaway with that message ID was not found!')],
          ephemeral: true
        });
      }

      if (gw.ended) {
        return interaction.reply({
          embeds: [embeds.info('This giveaway has already ended!')],
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });
      await giveawayManager.resolveGiveaway(gw);
      return interaction.editReply({
        embeds: [embeds.success('Giveaway ended and winner(s) picked!')]
      });
    }

    if (sub === 'reroll') {
      const messageId = interaction.options.getString('message-id');
      const result = await giveawayManager.reroll(messageId);

      if (!result.success) {
        return interaction.reply({
          embeds: [embeds.error(result.message)],
          ephemeral: true
        });
      }

      const channel = await interaction.client.channels.fetch(result.channelId).catch(() => null);
      if (channel) {
        await channel.send({
          content: `🎉 **New Winner Rerolled!** Congratulations <@${result.winner}>! You won **${result.prize}**!`
        });
      }

      return interaction.reply({
        embeds: [embeds.success(`Rerolled new winner: <@${result.winner}>!`)]
      });
    }
  }
};
