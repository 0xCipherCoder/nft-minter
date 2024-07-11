import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaNftMinting } from "../target/types/solana_nft_minting";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { assert } from "chai";
import axios from "axios";

describe("solana_nft_minting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaNftMinting as Program<SolanaNftMinting>;
  const user = anchor.web3.Keypair.generate();

  const collectionSize = 3;
  const metadata = ["NFT 1", "NFT 2", "NFT 3"];
//   const imageUrls = ["https://ipfs.io/ipfs/QmQBHarz2WFczTjz5GnhjHrbUPDnB48W5BM2v2h6HbE1rZ/1.png", 
//     "https://ipfs.io/ipfs/QmQBHarz2WFczTjz5GnhjHrbUPDnB48W5BM2v2h6HbE1rZ/10.png", 
//     "https://ipfs.io/ipfs/QmQBHarz2WFczTjz5GnhjHrbUPDnB48W5BM2v2h6HbE1rZ/6.png"];
  const imageUrls = ["url1", 
        "url2", 
        "url3"];

  let nftCollectionPda: anchor.web3.PublicKey;
  let mint: anchor.web3.Keypair;
  let tokenAccount: anchor.web3.PublicKey;

  it("Initializes the test state", async () => {
    // Airdrop SOL to the user
    const signature = await provider.connection.requestAirdrop(user.publicKey, 1000000000);
    await provider.connection.confirmTransaction(signature);

    // Derive the NFT collection PDA
    [nftCollectionPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("nft_collection"), user.publicKey.toBuffer()],
      program.programId
    );

    // Generate a new mint keypair
    mint = anchor.web3.Keypair.generate();

    // Derive the associated token account address
    tokenAccount = await getAssociatedTokenAddress(mint.publicKey, user.publicKey);
  });

  it("Mints an NFT collection", async () => {
    try {
      await program.methods
        .mintNftCollection(metadata, imageUrls, collectionSize)
        .accounts({
          nftCollection: nftCollectionPda,
          mint: mint.publicKey,
          tokenAccount: tokenAccount,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user, mint])
        .rpc();

      // Fetch the NFT collection account
      const nftCollectionAccount = await program.account.nftCollection.fetch(nftCollectionPda);

      // Assert the NFT collection was created correctly
      assert.equal(nftCollectionAccount.owner.toString(), user.publicKey.toString());
      assert.equal(nftCollectionAccount.size, collectionSize);
      assert.equal(nftCollectionAccount.nfts.length, collectionSize);

      // Check each NFT in the collection
      for (let i = 0; i < collectionSize; i++) {
        assert.equal(nftCollectionAccount.nfts[i].metadata, metadata[i]);
        assert.equal(nftCollectionAccount.nfts[i].imageUrl, imageUrls[i]);

        // Fetch the image to ensure it's retrievable
        // const response = await axios.get(imageUrls[i]);
        // assert.equal(response.status, 200);
      }

      // Check token balance
      const tokenBalance = await provider.connection.getTokenAccountBalance(tokenAccount);
      assert.equal(tokenBalance.value.uiAmount, collectionSize);

    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });
});