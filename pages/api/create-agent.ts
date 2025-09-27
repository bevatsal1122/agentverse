import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../lib/supabase";
import { TablesInsert } from "../types/database.types";

const BASE = "https://agentverse.ai/v1";
const TOKEN = process.env.AGENTVERSE_API_TOKEN;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

interface CreateAgentRequest {
  name: string;
  description: string;
  category: string;
  pythonCode: string;
  embeddedWalletAddress?: string;
  userId?: string;
}

interface AgentResponse {
  address: string;
  name: string;
  short_description: string;
  readme: string;
  network: string;
}

interface CodeUploadResponse {
  digest: string;
}

const pythonInitialCode = `
import asyncio
import aiohttp
from uagents import Agent, Context

agent = Agent()

// @agent.on_interval(period=2.0)
async def poll_endpoint(ctx: Context):
    url = "https://18f2d3d4389e.ngrok-free.app/api/test";
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                data = await response.text()
                ctx.logger.info(f"Response from {url}: {data}")
        except Exception as e:
            ctx.logger.error(f"Error while calling {url}: {e}")


@agent.on_event("startup")
async def say_hello(ctx: Context):
    """Logs hello message on startup and starts polling"""
    ctx.logger.info(f"Hello, I'm an agent and my address is {ctx.agent.address}.")

if __name__ == "__main__":
    agent.run()

`;

// Create the agent (user-scoped)
async function createAgent(
  name: string,
  description: string
): Promise<AgentResponse> {
  const res = await fetch(`${BASE}/hosting/agents`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      short_description: description,
      readme: `# ${name}\n${description}\n\nUsage: send a chat message 'predict' with JSON payload.`,
      network: "testnet", // or "mainnet"
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Create failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

async function combineCodeWithChatGPT(
  initialCode: string,
  userCode: string
): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not found, using direct combination");
    return `${initialCode}\n\n# User-provided code:\n${userCode}`;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a Python expert specializing in the uAgents framework. Your task is to combine initial agent code with user-provided code, ensuring they work together seamlessly. Maintain the existing structure and imports while integrating the user's functionality.",
          },
          {
            role: "user",
            content: `Please combine this initial uAgents code:\n\n\`\`\`python\n${initialCode}\n\`\`\`\n\nWith this user-provided code:\n\n\`\`\`python\n${userCode}\n\`\`\`\n\nReturn only the combined Python code, ensuring it's syntactically correct and maintains the uAgents framework structure. Ensure there are no same imports.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ChatGPT API error:", response.status, errorText);
      throw new Error(`ChatGPT API failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const combinedCode = data.choices[0]?.message?.content?.trim();

    if (!combinedCode) {
      throw new Error("No code returned from ChatGPT");
    }

    // Extract code from markdown if present
    const codeMatch = combinedCode.match(/```python\n([\s\S]*?)\n```/);
    const finalCode = codeMatch ? codeMatch[1] : combinedCode;

    console.log("Successfully combined code with ChatGPT");
    return finalCode;
  } catch (error) {
    console.error("Error calling ChatGPT:", error);
    console.log("Falling back to direct combination");
    return `${initialCode}\n\n# User-provided code:\n${userCode}`;
  }
}

async function uploadCode(address: string, pythonCode: string) {
  // Combine initial code with user code using ChatGPT
  const combinedCode = await combineCodeWithChatGPT(
    pythonInitialCode,
    pythonCode
  );

  const files = [
    {
      language: "python",
      name: "agent.py",
      value: combinedCode.trim(),
    },
  ];
  console.log(
    "Uploading files:",
    files.map((f) => ({
      name: f.name,
      language: f.language,
      contentLength: f.value.length,
    }))
  );

  const codePayload = JSON.stringify(files);
  console.log("Code payload being sent:", codePayload);

  const TOKEN = process.env.AGENTVERSE_API_TOKEN;
  const res = await fetch(
    `https://agentverse.ai/v1/hosting/agents/${address}/code`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: codePayload }),
    }
  );

  console.log("Code upload response:", res);

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Code upload failed:", res.status, errorText);
    throw new Error(`Code upload failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

// Start the agent
async function startAgent(
  address: string,
  noCache: boolean = false
): Promise<any> {
  const url = new URL(`${BASE}/hosting/agents/${address}/start`);
  if (noCache) {
    url.searchParams.set("no_cache", "true");
  }

  console.log(
    `Starting agent at address: ${address}${noCache ? " (no_cache=true)" : ""}`
  );

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Failed to start agent ${address}:`, res.status, errorText);
    throw new Error(`Start failed: ${res.status} ${errorText}`);
  }

  const response = await res.json();
  console.log(`Agent ${address} started successfully:`, {
    running: response.running,
    revision: response.revision,
    domain: response.domain,
  });

  return response;
}

// Fetch latest logs (optional sanity check)
async function latestLogs(address: string): Promise<any[]> {
  const res = await fetch(`${BASE}/hosting/agents/${address}/logs/latest`, {
    method: "GET",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Logs failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

// Save agent to database
async function saveAgentToDatabase(
  agentData: AgentResponse,
  category: string,
  pythonCode: string,
  embeddedWalletAddress?: string,
  userId?: string
): Promise<string> {
  const agentInsert: TablesInsert<"agents"> = {
    id: agentData.address, // Use the agent address as the ID
    name: agentData.name,
    description: agentData.short_description,
    owner_address: "", // Keep empty for now
    user_id: userId || null, // Set the authenticated user's ID in the correct field
    status: "active",
    capabilities: [category], // Store category as a capability
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
    level: 1,
    experience_points: 0,
    reputation_score: 0,
    privy_wallet_address: embeddedWalletAddress || null, // Save the embedded wallet address
    // Store the Python code in personality field as JSON
    personality: {
      pythonCode: pythonCode,
      readme: agentData.readme,
      network: agentData.network,
    },
  };

  const { data, error } = await supabase
    .from("agents")
    .insert(agentInsert)
    .select("id")
    .single();

  if (error) {
    console.error("Database save error:", error);
    throw new Error(`Failed to save agent to database: ${error.message}`);
  }

  return data.id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check if API token is configured
  if (!TOKEN) {
    return res.status(500).json({
      error: "AGENTVERSE_API_TOKEN is not configured in environment variables",
    });
  }

  try {
    const {
      name,
      description,
      category,
      pythonCode,
      embeddedWalletAddress,
      userId,
    }: CreateAgentRequest = req.body;

    // Validate required fields
    if (!name || !description || !category || !pythonCode) {
      return res.status(400).json({
        error:
          "Missing required fields: name, description, category, and pythonCode are required",
      });
    }

    // Validate Python code contains basic uAgents structure
    // if (!pythonCode.includes("uagents") && !pythonCode.includes("Agent")) {
    //   return res.status(400).json({
    //     error:
    //       "Python code should use the uAgents framework and create an Agent instance",
    //   });
    // }

    // Step 1: Create the agent
    const agent = await createAgent(name, description);
    const address = agent.address;
    console.log("Created agent with address:", address);

    // Step 2: Upload code
    const { digest } = await uploadCode(address, pythonCode);
    console.log("Code uploaded with digest:", digest);

    // Step 3: Start the agent (with no_cache to ensure fresh start)
    let started;
    try {
      started = await startAgent(address, true);
      console.log("Agent started successfully:", started);
    } catch (startError) {
      console.error("Failed to start agent:", startError);
      // Try starting without no_cache as fallback
      try {
        console.log("Retrying start without no_cache...");
        started = await startAgent(address, false);
        console.log("Agent started on retry:", started);
      } catch (retryError) {
        console.error("Failed to start agent on retry:", retryError);
        throw new Error(
          `Agent creation succeeded but failed to start: ${
            startError instanceof Error
              ? startError.message
              : String(startError)
          }`
        );
      }
    }

    // Step 4: Get initial logs
    const logs = await latestLogs(address);
    console.log("Latest logs:", logs.slice(0, 5));

    // Step 5: Save agent to database
    console.log("Saving agent to database:", address);
    let savedAgentId: string | null = null;
    try {
      savedAgentId = await saveAgentToDatabase(
        agent,
        category,
        pythonCode,
        embeddedWalletAddress,
        userId
      );
      console.log("Agent saved to database with ID:", savedAgentId);
    } catch (dbError) {
      console.error("Failed to save agent to database:", dbError);
      // Continue with the response even if database save fails
      // The agent is still created and running on AgentVerse
    }

    // Return success response
    res.status(200).json({
      success: true,
      agent: {
        address,
        name: agent.name,
        description: agent.short_description,
        network: agent.network,
        databaseId: savedAgentId,
      },
      deployment: {
        codeDigest: digest,
        startResponse: started,
        initialLogs: logs.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Error creating agent:", error);

    // Return appropriate error response
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({
      error: "Failed to create agent",
      details: errorMessage,
    });
  }
}
