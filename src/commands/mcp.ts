import { startMcpServer } from "../mcp";

export async function handleMcp(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case "install": {
      const execPath = process.execPath;
      const scriptPath = process.argv[1];
      const isLocal = args.includes("--local");
      const scope = isLocal ? "local" : "user";
      let command: string;
      if (scriptPath.endsWith(".ts")) {
        command = `claude mcp add nooon --scope ${scope} -- ${execPath} run ${scriptPath} mcp`;
      } else if (scriptPath.endsWith(".js")) {
        command = `claude mcp add nooon --scope ${scope} -- bunx nooon mcp`;
      } else {
        command = `claude mcp add nooon --scope ${scope} -- ${execPath} mcp`;
      }
      console.log(command);
      break;
    }

    case "config": {
      const execPath = process.execPath;
      const scriptPath = process.argv[1];
      let config: object;
      if (scriptPath.endsWith(".ts")) {
        config = {
          mcpServers: {
            nooon: { command: execPath, args: ["run", scriptPath, "mcp"] },
          },
        };
      } else if (scriptPath.endsWith(".js")) {
        config = {
          mcpServers: {
            nooon: { command: "bunx", args: ["nooon", "mcp"] },
          },
        };
      } else {
        config = {
          mcpServers: {
            nooon: { command: execPath, args: ["mcp"] },
          },
        };
      }
      console.log(JSON.stringify(config, null, 2));
      break;
    }

    default:
      // No subcommand or unknown = start server
      await startMcpServer();
      break;
  }
}
