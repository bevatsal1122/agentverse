import { NextApiRequest, NextApiResponse } from "next";

import { TablesInsert } from "../../types/database.types";
import { supabase } from "../../lib/supabase";

type User = TablesInsert<"users">;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { privyId, email } = req.body;

    if (!privyId) {
      return res.status(400).json({ error: "Privy ID is required" });
    }

    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("privy_id", privyId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected for new users
      console.error("Error fetching user:", fetchError);
      return res.status(500).json({
        error: "Failed to check user existence",
        details: fetchError.message,
      });
    }

    if (existingUser) {
      // User exists, return user data
      return res.status(200).json({
        user: existingUser,
        isNewUser: false,
        message: "User found",
      });
    }

    // User doesn't exist, create new user
    const newUser: User = {
      privy_id: privyId,
      email: email || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createdUser, error: createError } = await supabase
      .from("users")
      .insert(newUser)
      .select("*")
      .single();

    if (createError) {
      console.error("Error creating user:", createError);
      return res
        .status(500)
        .json({ error: "Failed to create user", details: createError.message });
    }

    return res.status(201).json({
      user: createdUser,
      isNewUser: true,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Unexpected error in check-or-create user:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
