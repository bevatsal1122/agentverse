import { NextApiRequest, NextApiResponse } from "next";
import { AuthorizationContext, PrivyClient } from "@privy-io/node";
import { ethers } from "ethers";
// Demo endpoint: generates a random key and saves it under a fixed demo user

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) public returns (bool)",
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const privy = new PrivyClient({
    appId: "cmg25mfu6002yl10dqx1h3e0p",
    appSecret:
      "5ShRdifyjeUK6hvFTURorAAgvkY4z6uXWYUCcD4FbxtMcNHRtkpTP5XqFLxeheZXjT1j4BnG4oAuRRcvXvBD7TdV",
  });
  const user = await privy
    .users()
    .getByEmailAddress({ address: "amitmanojgaikwad@gmail.com" });
  const wallet = user.linked_accounts.find(
    (w) => w.connector_type === "embedded"
  );
  console.log(wallet);
  const authorizationContext: AuthorizationContext = {
    authorization_private_keys: [
      "wallet-auth:MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgczbbXBmmmb4tyVBUOxUntdG5hL9AUtKK+jHxxoj1NZahRANCAATtQZD/n6+4ZbFNjDHy6saXt9WtqvPI876PLQkT2dn2Za1YZUxFJoBfO77cabW1pXojUb0UGqsGGrha8dLPaawx",
    ],
  };

  const message = "Hello, Ethereum.";
  const transferData = new ethers.Interface(ERC20_ABI).encodeFunctionData(
    "transfer",
    ["0x93104E260cb74E94038F4325098d31EE426C6F85", 100]
  );
  console.log(transferData);
  const response = await privy
    .wallets()
    .ethereum()
    .sendTransaction(wallet?.id, {
      caip2: "eip155:421614",
      params: {
        transaction: {
          to: "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1",
          value: 0,
          data: transferData,
          chain_id: 421614,
        },
      },
      authorization_context: authorizationContext,
    });

  console.log(response);

  return res.status(200).json({ message: "Hello, world!" });
}
