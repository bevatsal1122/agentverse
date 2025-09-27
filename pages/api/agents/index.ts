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
      return res.status(500).json({
        error: result.error || "Failed to fetch agents",
      });
    }

    return res.status(200).json({
      agents: result.data || [],
    });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
