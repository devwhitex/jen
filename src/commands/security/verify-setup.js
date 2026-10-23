const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
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
    .setName('verify-setup')
    .setDescription('Deploy a 1-click button verification portal to block raid bots')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel where the verification panel will be posted')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('role')
        .setDescription('Role given to members when verified')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('title')
        .setDescription('Custom Title for verification panel')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('description')
        .setDescription('Custom instructions or rules text')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    const title = interaction.options.getString('title') || '🛡️ Server Verification Gate';
    const customDesc = interaction.options.getString('description');

    const defaultDesc =
      `Welcome to **${interaction.guild.name}**!\n\n` +
      `To protect our community against automated raid bots and spam accounts, all new members must complete verification before gaining access to chat channels.\n\n` +
      `**Instructions:**\n` +
      `1. Read our server rules in the rules channel.\n` +
      `2. Click the green **"Verify Now"** button below.\n` +
      `3. You will immediately be granted the <@&${role.id}> role and access to the server!`;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(customDesc || defaultDesc)
      .setColor('#5865F2')
      .setThumbnail(interaction.guild.iconURL() || null)
      .setFooter({ text: `${interaction.guild.name} • Anti-Raid Security Gate` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_verify_member')
        .setLabel('✅ Click Here to Verify')
        .setStyle(ButtonStyle.Success)
    );

    try {
      const msg = await channel.send({
        embeds: [embed],
        components: [row]
      });

      db.saveVerificationSettings(interaction.guild.id, channel.id, role.id, msg.id, 1);

      return interaction.editReply({
        embeds: [embeds.success(`Verification gate successfully deployed to ${channel} with role <@&${role.id}>!`)]
      });
    } catch (err) {
      return interaction.editReply({
        embeds: [embeds.error(`Failed to deploy verification panel: ${err.message}`)]
      });
    }
  }
};
