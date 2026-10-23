const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/db');

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
    .setName('timeout')
    .setDescription('Temporarily timeout/mute a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('Member to timeout')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('duration')
        .setDescription('Duration (e.g., 60s, 5m, 1h, 1d, 7d - max 28 days)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        embeds: [embeds.error('This user is not in the server!')],
        ephemeral: true
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        embeds: [embeds.error('I cannot timeout this user (they may have higher permissions than me)!')],
        ephemeral: true
      });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [embeds.error('You cannot timeout someone with a role equal to or higher than yours!')],
        ephemeral: true
      });
    }

    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs < 5000 || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({
        embeds: [embeds.error('Invalid duration format! Examples: `5m`, `30m`, `1h`, `1d`. Max 28 days.')],
        ephemeral: true
      });
    }

    await member.timeout(durationMs, `${reason} (by ${interaction.user.tag})`);

    // Log to mod channel
    const settings = db.getSettings(interaction.guild.id);
    if (settings.mod_log_channel_id) {
      const logChannel = interaction.guild.channels.cache.get(settings.mod_log_channel_id);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            embeds.mod(
              `**Target:** <@${member.id}>\n` +
              `**Moderator:** <@${interaction.user.id}>\n` +
              `**Duration:** \`${durationStr}\` (<t:${Math.floor((Date.now() + durationMs) / 1000)}:R>)\n` +
              `**Reason:** ${reason}`,
              'Member Timed Out'
            )
          ]
        }).catch(() => null);
      }
    }

    return interaction.reply({
      embeds: [
        embeds.success(
          `Successfully timed out <@${member.id}> for **${durationStr}**.\n` +
          `• **Reason:** ${reason}`
        )
      ]
    });
  }
};
