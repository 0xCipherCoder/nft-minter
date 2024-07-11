import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaVault } from "../target/types/solana_vault";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("solana_vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaVault as Program<SolanaVault>;
  const user = anchor.web3.Keypair.generate();
  const protocolWallet = anchor.web3.Keypair.generate();
  let vaultPda: anchor.web3.PublicKey;
  let vaultBump: number;
  let nftMint: anchor.web3.Keypair;
  let userTokenAccount: anchor.web3.PublicKey;
  let vaultTokenAccount: anchor.web3.PublicKey;

  it("Initializes the test state", async () => {
    // Airdrop SOL to the user and protocol wallet
    let signature = await provider.connection.requestAirdrop(user.publicKey, 2000000000);
    await provider.connection.confirmTransaction(signature);
    signature = await provider.connection.requestAirdrop(protocolWallet.publicKey, 1000000000);
    await provider.connection.confirmTransaction(signature);

    // Derive the vault PDA
    [vaultPda, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("vault"), user.publicKey.toBuffer()],
      program.programId
    );

    // Generate a new mint keypair
    nftMint = anchor.web3.Keypair.generate();

    // Derive the associated token account addresses
    userTokenAccount = await getAssociatedTokenAddress(nftMint.publicKey, user.publicKey);
    vaultTokenAccount = await getAssociatedTokenAddress(nftMint.publicKey, vaultPda, true);

    // Create the mint and associated token account
    const createMintIx = anchor.web3.SystemProgram.createAccount({
      fromPubkey: user.publicKey,
      newAccountPubkey: nftMint.publicKey,
      space: 82,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(82),
      programId: TOKEN_PROGRAM_ID,
    });

    const initMintIx = createInitializeMintInstruction(nftMint.publicKey, 0, user.publicKey, user.publicKey);

    const createUserTokenAccountIx = createAssociatedTokenAccountInstruction(
      user.publicKey,
      userTokenAccount,
      user.publicKey,
      nftMint.publicKey
    );

    const mintToUserTokenAccountIx = createMintToInstruction(
      nftMint.publicKey,
      userTokenAccount,
      user.publicKey,
      1
    );

    const tx = new anchor.web3.Transaction().add(createMintIx, initMintIx, createUserTokenAccountIx, mintToUserTokenAccountIx);

    await provider.sendAndConfirm(tx, [user, nftMint]);

    // Initialize the vault
    await program.methods
      .initializeVault()
      .accounts({
        vault: vaultPda,
        authority: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();
  });

  it("Locks an NFT", async () => {
    const protocolFee = new anchor.BN(1000000); // 0.001 SOL

    await program.methods
      .lockNft(protocolFee)
      .accounts({
        vault: vaultPda,
        nftMint: nftMint.publicKey,
        userTokenAccount,
        vaultTokenAccount,
        authority: user.publicKey,
        protocolWallet: protocolWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user])
      .rpc();

    const vaultAccount = await program.account.vault.fetch(vaultPda);
    assert.isTrue(vaultAccount.locked);

    // Verify that the NFT was transferred to the vault token account
    const vaultTokenAccountInfo = await getAccount(provider.connection, vaultTokenAccount);
    assert.equal(vaultTokenAccountInfo.amount.toString(), "1");
  });

  it("Unlocks an NFT", async () => {
    await program.methods
      .unlockNft()
      .accounts({
        vault: vaultPda,
        nftMint: nftMint.publicKey,
        userTokenAccount,
        vaultTokenAccount,
        authority: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const vaultAccount = await program.account.vault.fetch(vaultPda);
    assert.isFalse(vaultAccount.locked);

    // Verify that the NFT was transferred back to the user token account
    const userTokenAccountInfo = await getAccount(provider.connection, userTokenAccount);
    assert.equal(userTokenAccountInfo.amount.toString(), "1");
  });
});