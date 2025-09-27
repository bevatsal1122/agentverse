import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { saveSessionKey } from "../lib/server/sessionVault";

// Demo endpoint: generates a random key and saves it under a fixed demo user
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const keyHex = ("0x" +
    crypto.randomBytes(32).toString("hex")) as `0x${string}`;
  // In real code, tie to authenticated user (headers/cookies/session)
  saveSessionKey("demo-user", keyHex);
  return res.status(200).json({ keyHex });
}
