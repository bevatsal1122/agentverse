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

async function uploadCode(address: string, pythonCode: string) {
  const files = [
    {
      language: "python",
      name: "agent.py",
      value: pythonCode.trim(),
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
async function startAgent(address: string): Promise<any> {
  const res = await fetch(`${BASE}/hosting/agents/${address}/start`, {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Start failed: ${res.status} ${errorText}`);
  }

  return res.json();
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
  pythonCode: string
): Promise<string> {
  const agentInsert: TablesInsert<"agents"> = {
    id: agentData.address, // Use the agent address as the ID
    name: agentData.name,
    description: agentData.short_description,
    owner_address: "", // This should be set based on the authenticated user
    status: "active",
    capabilities: [category], // Store category as a capability
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
    level: 1,
    experience_points: 0,
    reputation_score: 0,
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
    const { name, description, category, pythonCode }: CreateAgentRequest =
      req.body;

    // Validate required fields
    if (!name || !description || !category || !pythonCode) {
      return res.status(400).json({
        error:
          "Missing required fields: name, description, category, and pythonCode are required",
      });
    }

    // Validate Python code contains basic uAgents structure
    if (!pythonCode.includes("uagents") && !pythonCode.includes("Agent")) {
      return res.status(400).json({
        error:
          "Python code should use the uAgents framework and create an Agent instance",
      });
    }

    // Step 1: Create the agent
    const agent = await createAgent(name, description);
    const address = agent.address;
    console.log("Created agent with address:", address);

    // Step 2: Upload code
    const { digest } = await uploadCode(address, pythonCode);
    console.log("Code uploaded with digest:", digest);

    // Step 3: Start the agent
    const started = await startAgent(address);
    console.log("Agent started:", started);

    // Step 4: Get initial logs
    const logs = await latestLogs(address);
    console.log("Latest logs:", logs.slice(0, 5));

    // Step 5: Save agent to database
    console.log("Saving agent to database:", address);
    let savedAgentId: string | null = null;
    try {
      savedAgentId = await saveAgentToDatabase(agent, category, pythonCode);
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
