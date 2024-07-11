import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaSwap } from "../target/types/solana_swap";
import { SolanaVault } from "../target/types/solana_vault";
import { SolanaNftMinting } from "../target/types/solana_nft_minting";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { assert } from "chai";

describe("solana_swap", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const swapProgram = anchor.workspace.SolanaSwap as Program<SolanaSwap>;
  const vaultProgram = anchor.workspace.SolanaVault as Program<SolanaVault>;
  const mintingProgram = anchor.workspace.SolanaNftMinting as Program<SolanaNftMinting>;

  const user = anchor.web3.Keypair.generate();
  const vaultOwner = anchor.web3.Keypair.generate();
  const protocolWallet = anchor.web3.Keypair.generate();
  
  let vaultPda: anchor.web3.PublicKey;
  let vaultBump: number;
  let vaultTokenAccount: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let nftMint: anchor.web3.Keypair;
  let nftCollectionPda: anchor.web3.PublicKey;
  let nftCollectionBump: number;

  it("Initializes the test state", async () => {
    // Airdrop SOL to the user and vault owner
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 1000000000)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(vaultOwner.publicKey, 1000000000)
    );

    // Derive the vault PDA
    [vaultPda, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("vault"), vaultOwner.publicKey.toBuffer()],
      vaultProgram.programId
    );

    // Generate a new mint keypair
    nftMint = anchor.web3.Keypair.generate();

    // Derive the associated token account addresses
    vaultTokenAccount = await getAssociatedTokenAddress(nftMint.publicKey, vaultPda, true);
    userTokenAccount = await getAssociatedTokenAddress(nftMint.publicKey, user.publicKey);

    // Derive the nft collection PDA
    [nftCollectionPda, nftCollectionBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("nft_collection"), user.publicKey.toBuffer()],
      mintingProgram.programId
    );

    // Initialize the vault
    await vaultProgram.methods.initializeVault()
      .accounts({
        vault: vaultPda,
        authority: vaultOwner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vaultOwner])
      .rpc();

    // Mint an NFT collection
    const metadata = ["NFT 1"];
    const imageUrls = ["https://example.com/nft1.png"];
    const collectionSize = 1;

    await mintingProgram.methods.mintNftCollection(metadata, imageUrls, collectionSize)
      .accounts({
        nftCollection: nftCollectionPda,
        mint: nftMint.publicKey,
        tokenAccount: userTokenAccount,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user, nftMint])
      .rpc();

    // Lock the NFT into the vault
    await vaultProgram.methods.lockNft(new anchor.BN(10000000))
      .accounts({
        vault: vaultPda,
        nftMint: nftMint.publicKey,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        authority: user.publicKey,
        protocolWallet: protocolWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user])
      .rpc();
  });

  it("Swaps SOL for NFT", async () => {
    // Swap SOL for NFT
    await swapProgram.methods.swapSolForNft(new anchor.BN(100000000))
      .accounts({
        vault: vaultPda,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        authority: user.publicKey,
        protocolWallet: protocolWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    // Fetch the vault account
    const vaultAccount = await vaultProgram.account.vault.fetch(vaultPda);

    // Assert the vault was unlocked
    assert.isFalse(vaultAccount.locked);

    // Check the user's token balance
    const userTokenBalance = await provider.connection.getTokenAccountBalance(userTokenAccount);
    assert.equal(userTokenBalance.value.uiAmount, 1);

    // Check the vault's token balance (should be 0)
    const vaultTokenBalance = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
    assert.equal(vaultTokenBalance.value.uiAmount, 0);

    // Check the protocol wallet's SOL balance
    const protocolWalletBalance = await provider.connection.getBalance(protocolWallet.publicKey);
    assert.equal(protocolWalletBalance, 100000000);
  });
});
