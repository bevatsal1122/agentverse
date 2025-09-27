import { NextApiRequest, NextApiResponse } from "next";
import { supabaseService } from "../services/supabaseService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await supabaseService.getTokens();

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to fetch tokens",
        details: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      tokens: result.data || [],
      count: result.data?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return res.status(500).json({
      error: "Failed to fetch tokens",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
