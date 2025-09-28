import { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";
import { REGISTER_CONTRACT_ABI } from "../lib/contracts/registerABI";


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  //   if (req.method !== 'POST') {
  //     return res.status(405).json({ error: 'Method not allowed' });
  //   }

const hash = ethers.namehash("vatsal.agenticverse.eth")
console.log(hash);

  return res.status(200).json({ 
    message: "Successfully sent 0.0005 ETH and registered label" 
  });
}




