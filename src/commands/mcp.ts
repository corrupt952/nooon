import { startMcpServer } from "../mcp";

export async function handleMcp(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case "install": {
      const execPath = process.execPath;
      const scriptPath = process.argv[1];
      const isLocal = args.includes("--local");
      const scope = isLocal ? "local" : "user";
      // If running as compiled binary, use execPath alone; otherwise use execPath + script
      const command =
        scriptPath.endsWith(".ts") || scriptPath.endsWith(".js")
          ? `claude mcp add nooon --scope ${scope} -- ${execPath} run ${scriptPath} mcp`
          : `claude mcp add nooon --scope ${scope} -- ${execPath} mcp`;
      console.log(command);
      break;
    }

    case "config": {
      const execPath = process.execPath;
      const scriptPath = process.argv[1];
      const config =
        scriptPath.endsWith(".ts") || scriptPath.endsWith(".js")
          ? {
              mcpServers: {
                nooon: {
                  command: execPath,
                  args: ["run", scriptPath, "mcp"],
                },
              },
            }
          : {
              mcpServers: {
                nooon: {
                  command: execPath,
                  args: ["mcp"],
                },
              },
            };
      console.log(JSON.stringify(config, null, 2));
      break;
    }

    default:
      // No subcommand or unknown = start server
      await startMcpServer();
      break;
  }
}
