const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buttonroles')
    .setDescription('Create interactive self-assignable role panels with buttons')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to post the role panel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('title')
        .setDescription('Title for the role panel')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('description')
        .setDescription('Description text explaining the roles')
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('role1')
        .setDescription('First role')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('label1')
        .setDescription('Button label for role 1')
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('role2')
        .setDescription('Second role (optional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('label2')
        .setDescription('Button label for role 2')
        .setRequired(false)
    )
    .addRoleOption(opt =>
      opt.setName('role3')
        .setDescription('Third role (optional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('label3')
        .setDescription('Button label for role 3')
        .setRequired(false)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');

    const role1 = interaction.options.getRole('role1');
    const label1 = interaction.options.getString('label1');

    const role2 = interaction.options.getRole('role2');
    const label2 = interaction.options.getString('label2');

    const role3 = interaction.options.getRole('role3');
    const label3 = interaction.options.getString('label3');

    const embed = new EmbedBuilder()
      .setTitle(`🎭 ${title}`)
      .setDescription(
        `${description.replace(/\\n/g, '\n')}\n\n` +
        `**Click any button below to get or remove that role:**\n` +
        `• <@&${role1.id}>: **${label1}**\n` +
        (role2 ? `• <@&${role2.id}>: **${label2 || role2.name}**\n` : '') +
        (role3 ? `• <@&${role3.id}>: **${label3 || role3.name}**\n` : '')
      )
      .setColor(config.embedColor)
      .setFooter({ text: 'Self-Assignable Roles • Click to toggle' });

    const row = new ActionRowBuilder();

    const id1 = `role_btn_${role1.id}_${Date.now()}`;
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(id1)
        .setLabel(label1)
        .setStyle(ButtonStyle.Primary)
    );

    let id2 = null;
    if (role2) {
      id2 = `role_btn_${role2.id}_${Date.now()}`;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(id2)
          .setLabel(label2 || role2.name)
          .setStyle(ButtonStyle.Secondary)
      );
    }

    let id3 = null;
    if (role3) {
      id3 = `role_btn_${role3.id}_${Date.now()}`;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(id3)
          .setLabel(label3 || role3.name)
          .setStyle(ButtonStyle.Secondary)
      );
    }

    const msg = await channel.send({
      embeds: [embed],
      components: [row]
    });

    db.addButtonRole(interaction.guild.id, msg.id, role1.id, id1, label1);
    if (role2 && id2) db.addButtonRole(interaction.guild.id, msg.id, role2.id, id2, label2 || role2.name);
    if (role3 && id3) db.addButtonRole(interaction.guild.id, msg.id, role3.id, id3, label3 || role3.name);

    return interaction.reply({
      embeds: [embeds.success(`Button roles panel posted to ${channel}!`)],
      ephemeral: true
    });
  }
};
