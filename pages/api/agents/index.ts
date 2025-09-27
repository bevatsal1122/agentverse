import { NextApiRequest, NextApiResponse } from "next";
import { agentService } from "../../services/agentService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await agentService.getAgents();

    if (!result.success) {
      console.error("Error fetching agents:", result.error);
      return res.status(500).json({
        error: "Failed to fetch agents",
        details: result.error,
      });
    }

    res.status(200).json({
      success: true,
      agents: result.data || [],
      count: result.data?.length || 0,
    });
  } catch (error) {
    console.error("Error in agents API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({
      error: "Failed to fetch agents",
      details: errorMessage,
    });
  }
}