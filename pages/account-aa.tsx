"use client";

import {
  useCreateWallet,
  useDelegatedActions,
  useLogin,
  usePrivy,
  useSessionSigners,
} from "@privy-io/react-auth";

export default function Home() {
  const { user, ready, authenticated } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { login } = useLogin();
  const { addSessionSigners } = useSessionSigners();
  console.log(user);
  return (
    <div>
      <p>Account AA Demo</p>
      <p>ready:{ready}</p>
      <p>authenticated:{authenticated}</p>
      <hr />
      <button
        onClick={() => {
          console.log("started");
          createWallet({ createAdditional: true });
          console.log("ended");
        }}
      >
        create embedded wallet
      </button>
      <hr />
      <button onClick={login}>login</button>
      <hr />
      <button
        onClick={() => {
          addSessionSigners({
            address: "0x337dcC567b4d7f32c88B63cF8BA3ab800421E80C",
            signers: [{ signerId: "dax1262iligkh4l56txg1hgk" }],
          });
        }}
      >
        delegate wallet
      </button>
    </div>
  );
}
