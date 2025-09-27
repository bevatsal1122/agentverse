import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data: agents, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching agents:", error);
      return res.status(500).json({
        error: "Failed to fetch agents",
        details: error.message,
      });
    }

    res.status(200).json({
      success: true,
      agents: agents || [],
      count: agents?.length || 0,
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