const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  createEmbed({
    title = null,
    description = null,
    color = config.embedColor,
    fields = [],
    author = null,
    footer = null,
    thumbnail = null,
    image = null,
    timestamp = true
  } = {}) {
    const embed = new EmbedBuilder();

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (color) embed.setColor(color);
    if (fields.length) embed.addFields(fields);
    if (author) embed.setAuthor(author);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);

    if (footer) {
      embed.setFooter(typeof footer === 'string' ? { text: footer } : footer);
    } else {
      embed.setFooter({ text: 'Server Maintainer Bot • Multi-Tool System' });
    }

    if (timestamp) embed.setTimestamp();

    return embed;
  },

  success(description, title = 'Success') {
    return this.createEmbed({
      title: `${config.emojis.success} ${title}`,
      description,
      color: config.successColor
    });
  },

  error(description, title = 'Error') {
    return this.createEmbed({
      title: `${config.emojis.error} ${title}`,
      description,
      color: config.errorColor
    });
  },

  warning(description, title = 'Warning') {
    return this.createEmbed({
      title: `${config.emojis.warning} ${title}`,
      description,
      color: config.warningColor
    });
  },

  info(description, title = 'Information') {
    return this.createEmbed({
      title: `${config.emojis.stats} ${title}`,
      description,
      color: config.infoColor
    });
  },

  mod(description, title = 'Moderation Action') {
    return this.createEmbed({
      title: `${config.emojis.moderation} ${title}`,
      description,
      color: config.embedColor
    });
  },

  maintenance(description, title = 'Server Maintenance') {
    return this.createEmbed({
      title: `${config.emojis.maintenance} ${title}`,
      description,
      color: config.maintenanceColor
    });
  }
};
