import {
  Client,
  Events,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  roleMention,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { configDotenv } from "dotenv";
import { JSDOM } from "jsdom";
configDotenv();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

let notifyRole = "";
let notifyChannel = "";
let serverName = "EU 2x Monthly Large";
let gettingVipInterval;
let stockEmbedMessage;
let stockNotifyMessage;

let inStock = {
  "VIP + Queue Skip": false,
  "Queue Skip": false,
  "VIP + Queue Skip [1 Year]": false,
};

const stockEmbed = new EmbedBuilder()
  .setTitle("Vip Stock Watcher")
  .setDescription(`Watching vip for: ${serverName}`)
  .setThumbnail("https://link.rustinity.com/rustinity-r-logo-small.png")
  .setColor("#00f53d")
  .setFooter({
    text: "last checked",
  })
  .setTimestamp(Date.now());

const subscribeButton = new ButtonBuilder()
  .setCustomId("subscribe")
  .setLabel("Subscribe")
  .setStyle(ButtonStyle.Success);
const unsubscribeButton = new ButtonBuilder()
  .setCustomId("unsubscribe")
  .setLabel("Unsubscribe")
  .setStyle(ButtonStyle.Danger);

const actionRow = new ActionRowBuilder().addComponents(
  subscribeButton,
  unsubscribeButton
);

client.on(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  console.log("interaction recieved: " + interaction.customId)

  try{
    if (interaction.customId == "subscribe") {
      // check to see if user already has role
      if (
        interaction.member.roles.cache.find((role) => role.name == "vip-notify")
      ) {
        return await interaction.reply({
          content: "You are already subscribed to receive stock updates",
          ephemeral: true,
        });
      } else {
        await interaction.member.roles.add(
          interaction.guild.roles.cache.find((role) => role.name == "vip-notify")
        );
        return await interaction.reply({
          content:
            "You are now signed up to recieve vip stock updates ✅ (You will only receive pings for queue skip, not for any other VIP packages)",
          ephemeral: true,
        });
      }
    }
  
    if (interaction.customId == "unsubscribe") {
      // check to see if user already has role
      if (
        !interaction.member.roles.cache.find((role) => role.name == "vip-notify")
      ) {
        return await interaction.reply({
          content: "You are already unsubscribed from receiving stock updates",
          ephemeral: true,
        });
      } else {
        interaction.member.roles.remove(
          interaction.guild.roles.cache.find((role) => role.name == "vip-notify")
        );
  
        return await interaction.reply({
          content: "You will no longer receive VIP stock updates ❌",
          ephemeral: true,
        });
      }
    }
  
    if (interaction.commandName == "test") {
      console.log("erm...");
    }
  
    if (interaction.commandName === "set-notify-channel") {
      let channelId = interaction.options.get("channel-id").value;
  
      if (!Number.isInteger(parseInt(channelId))) {
        return await interaction.reply({
          content: `Channel id needs to be a number`,
          ephemeral: true,
        });
      } else if (
        !(await client.channels.fetch(channelId))
          .permissionsFor(interaction.guild.members.me)
          .has(PermissionsBitField.Flags.SendMessages)
      ) {
        return await interaction.reply({
          content: `I dont have permissions to send messages in that channel... ♿`,
          ephemeral: true,
        });
      }
      notifyChannel = channelId;
      let notifyChannelDetails = await client.channels.fetch(channelId);
      return await interaction.reply({
        content: `Notify channel set to ${notifyChannelDetails.name} ✅`,
        ephemeral: true,
      });
    }
  
    if (interaction.commandName == "stop") {
      if (!gettingVipInterval) {
        return await interaction.reply({
          content: "The bot isnt even running?? Am I missing something?",
          ephemeral: true,
        });
      } else {
        clearInterval(gettingVipInterval);
        (await interaction.guild.channels.fetch(notifyChannel)).send();
        return await interaction.reply({
          content: "Bot is now stopped",
          ephemeral: true,
        });
      }
    }
  
    if (interaction.commandName === "start") {
      // checking to see if notfiy channel is already set
      if (!notifyChannel) {
        return await interaction.reply({
          content: `Notify channel is not set, set it using the /set-notify-channel command`,
          ephemeral: true,
        });
      }
  
      if (!interaction.guild.members.me.permissions.has("ManageMessages")) {
        return await interaction.reply({
          content:
            "erm... I dont have the 'manage messages' permission, unless you want me to spam the notify channel, I kinda need that 😑",
          ephemeral: true,
        });
      }
  
      // checking to see if notfiy role exists and if not checks to see if it can create one
      if (!notifyRole) {
        if (
          !interaction.guild.roles.cache.find((role) => role.name == "vip-notify")
        ) {
          if (!interaction.guild.members.me.permissions.has("ManageRoles")) {
            return await interaction.reply({
              content: `There is no role named "vip-notify" and I dont have permissions to create a new notify role, sir.`,
              ephemeral: true,
            });
          } else {
            notifyRole = (
              await interaction.guild.roles.create({
                name: "vip-notify",
                mentionable: true,
                position: 100,
              })
            ).id;
          }
        } else if (
          interaction.guild.roles.cache.find((role) => role.name == "vip-notify")
        ) {
          notifyRole = interaction.guild.roles.cache.find(
            (role) => role.name == "vip-notify"
          ).id;
        }
      }
  
      let currentNotifyChannel = await interaction.guild.channels.fetch(
        notifyChannel
      );
  
      // deleting previous channel messages
      await new Promise(async (resolve) => {
        let channelMessages;
        do {
          channelMessages = await currentNotifyChannel.messages.fetch({
            limit: 100,
          });
  
          if (channelMessages.size > 0) {
            for (const message of channelMessages.values()) {
              try {
                await currentNotifyChannel.bulkDelete(channelMessages, true);
              } catch (err) {
                return;
              }
            }
          }
        } while (channelMessages.size >= 2);
        resolve();
      });
  
      gettingVipInterval = setInterval(() => {
        try{
          let notifyPeople = false;
          fetch("https://store.rustinity.com/products?tag=eu-2x-monthly-large", {
            headers: {
              accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
              "accept-language": "en-US,en;q=0.9",
              "cache-control": "max-age=0",
              priority: "u=0, i",
              "sec-ch-ua":
                '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": '"Windows"',
              "sec-fetch-dest": "document",
              "sec-fetch-mode": "navigate",
              "sec-fetch-site": "same-origin",
              "sec-fetch-user": "?1",
              "upgrade-insecure-requests": "1",
            },
            referrer:
              "https://store.rustinity.com/products?tag=us-2x-monthly-large",
            referrerPolicy: "strict-origin-when-cross-origin",
            body: null,
            method: "GET",
            mode: "cors",
            credentials: "include",
          }).then(async (response) => {
            if (response.status != 200) {
              console.log(`erm... got ${response.status} response code`);
              return;
            } else {
              let html = await response.text();
    
              let doc = new JSDOM(html, { runScripts: "outside-only" }).window
                .document;
              let packages = doc.getElementsByClassName("category-package");
    
              if (
                !(
                  inStock["Queue Skip"] ==
                  (packages[1]
                    .getElementsByClassName("package-bott")[0]
                    .getElementsByClassName("category-package-buttons")[0]
                    .children[0].tagName ==
                    "A")
                ) &&
                packages[1]
                  .getElementsByClassName("package-bott")[0]
                  .getElementsByClassName("category-package-buttons")[0].children[0]
                  .tagName == "A"
              ) {
                notifyPeople = true;
              }
    
              for (let i = 0; i < packages.length; i++) {
                if (i == 0) {
                  inStock["VIP + Queue Skip"] =
                    packages[i]
                      .getElementsByClassName("package-bott")[0]
                      .getElementsByClassName("category-package-buttons")[0]
                      .children[0].tagName == "A";
                } else if (i == 1) {
                  inStock["Queue Skip"] =
                    packages[i]
                      .getElementsByClassName("package-bott")[0]
                      .getElementsByClassName("category-package-buttons")[0]
                      .children[0].tagName == "A";
                } else if (i == 2) {
                  inStock["VIP + Queue Skip [1 Year]"] =
                    packages[i]
                      .getElementsByClassName("package-bott")[0]
                      .getElementsByClassName("category-package-buttons")[0]
                      .children[0].tagName == "A";
                }
              }
    
              // remove previous fields if there are any
              stockEmbed.spliceFields(0, 3);
    
              // add new fields
              stockEmbed.addFields(
                {
                  name: `VIP + Queue Skip in stock: ${
                    inStock["VIP + Queue Skip"] ? "✅" : "❌"
                  }`,
                  value: " ",
                  inline: false,
                },
                {
                  name: `Queue Skip in stock: ${
                    inStock["Queue Skip"] ? "✅" : "❌"
                  }`,
                  value: " ",
                  inline: false,
                },
                {
                  name: `VIP + Queue Skip [1 Year] in stock: ${
                    inStock["VIP + Queue Skip [1 Year]"] ? "✅" : "❌"
                  }`,
                  value: " ",
                  inline: false,
                }
              );
    
              if (!stockEmbedMessage) {
                let message = await currentNotifyChannel.send({
                  embeds: [stockEmbed],
                  components: [actionRow],
                  silent: true,
                });
                stockEmbedMessage = message;
              } else {
                try {
                  stockEmbed.setTimestamp(Date.now());
                  await stockEmbedMessage.edit({
                    embeds: [stockEmbed],
                  });
                } catch (err) {
                  return;
                }
              }
    
              if (notifyPeople && !stockNotifyMessage) {
                let message = await currentNotifyChannel.send(
                  `${roleMention(notifyRole)} Yooo, Its back in stock!!! 📈✅💵🛒`
                );
                stockNotifyMessage = message;
              } else if (stockNotifyMessage && !inStock["Queue Skip"]) {
                try {
                  await stockNotifyMessage.delete();
                  stockNotifyMessage = undefined;
                } catch (err) {
                  stockNotifyMessage = undefined;
                  return;
                }
              }
            }
          });
        } catch(err) {
          console.log(err);
          return;
        }
        
      }, 5000);
  
      try {
        console.log("sent start confimation")
        interaction
          .reply({
            content: `Bot now watching vip stock updates for server: ${serverName} ✅`,
            ephemeral: true
          })
          .then((message) => {
            setTimeout(() => {
              try {
                message.delete();
              } catch (err) {
                return;
              }
            }, 10000);
          });
      } catch (err) {
        return;
      }
    }
  } catch(err) {
  console.log("Error occured: " + err);
  await interaction.reply({content: "error occured, try again", ephemeral: true});
}
});

client.login(process.env.TOKEN);
