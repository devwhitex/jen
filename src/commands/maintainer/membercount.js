const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const MemberCounterService = require('../../services/memberCounterService');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('Configure advanced live member counters with total, bots, online, boosts, and goal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Create the full live counter channels category')
        .addIntegerOption(opt =>
          opt.setName('goal')
            .setDescription('Target member goal (e.g. 500, 1000)')
            .setMinValue(1)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setgoal')
        .setDescription('Update the target member milestone goal')
        .addIntegerOption(opt =>
          opt.setName('goal')
            .setDescription('New target goal number')
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('refresh')
        .setDescription('Force an immediate sync of all counter channels')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      await interaction.deferReply({ ephemeral: true });
      const goal = interaction.options.getInteger('goal') || 500;

      try {
        const res = await MemberCounterService.setupCounters(interaction.guild, goal);
        return interaction.editReply({
          embeds: [
            embeds.success(
              `Live Member Counters successfully deployed!\n\n` +
              `• **Category:** ${res.category.name}\n` +
              `• **Total:** ${res.totalChannel.name}\n` +
              `• **Members:** ${res.membersChannel.name}\n` +
              `• **Bots:** ${res.botsChannel.name}\n` +
              `• **Online:** ${res.onlineChannel.name}\n` +
              `• **Boosts:** ${res.boostChannel.name}\n` +
              `• **Goal Counter:** ${res.goalChannel.name}\n\n` +
              `*Channels will automatically update as members join, leave, or boost!*`,
              'Member Counters Active'
            )
          ]
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [embeds.error(`Failed to setup member counters: ${err.message}`)]
        });
      }
    }

    if (sub === 'setgoal') {
      const goal = interaction.options.getInteger('goal');
      db.setMemberGoal(interaction.guild.id, goal);
      await MemberCounterService.updateCounters(interaction.guild);

      return interaction.reply({
        embeds: [embeds.success(`Target member goal updated to **${goal.toLocaleString()}** members!`)]
      });
    }

    if (sub === 'refresh') {
      await interaction.deferReply({ ephemeral: true });
      await MemberCounterService.updateCounters(interaction.guild);
      return interaction.editReply({
        embeds: [embeds.success('Member counter channels refreshed!')]
      });
    }
  }
};
