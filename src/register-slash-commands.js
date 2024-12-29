import { REST, Routes, ApplicationCommandOptionType } from "discord.js";
import { configDotenv } from "dotenv";
configDotenv();

const commands = [
  {
    name: "set-notify-channel",
    description: "Sets the role that should be notfied about vip status",
    options: [
      {
        name: "channel-id",
        description:
          "With discord developer enabled, right click on text channel you want to use, and click copy id",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "start",
    description:
      "Start watching for vip stock changes [WARNING: THIS CLEARS THE MESSAGES IN THE NOTIFIES CHANNEL]",
  },
  {
    name: "stop",
    description: "Stop watching for vip stock changes",
  },
  {
    name: "test",
    description: "test command for testing things",
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

try {
  console.log("Started refreshing application (/) commands.");

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
    body: commands,
  });

  console.log("Successfully reloaded application (/) commands.");
} catch (error) {
  console.error(error);
}
