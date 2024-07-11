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
    let signature = await provider.connection.requestAirdrop(user.publicKey, 1000000000);
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
  });

  it("Locks an NFT", async () => {
    const protocolFee = 1000000; // Set your protocol fee

    await program.methods
      .lockNft(new anchor.BN(protocolFee))
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

    // Fetch the vault account
    const vaultAccount = await program.account.vault.fetch(vaultPda);

    // Assert the vault was created correctly
    assert.equal(vaultAccount.owner.toString(), user.publicKey.toString());
    assert.equal(vaultAccount.nftMint.toString(), nftMint.publicKey.toString());
    assert.equal(vaultAccount.locked, true);

    // Check token balance in vault
    const vaultTokenBalance = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
    assert.equal(vaultTokenBalance.value.uiAmount, 1);
  });

  it("Unlocks an NFT", async () => {
    await program.methods
      .unlockNft()
      .accounts({
        vault: vaultPda,
        nftMint: nftMint.publicKey,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        authority: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Fetch the vault account
    const vaultAccount = await program.account.vault.fetch(vaultPda);

    // Assert the vault was unlocked correctly
    assert.equal(vaultAccount.locked, false);

    // Check token balance in user account
    const userTokenBalance = await provider.connection.getTokenAccountBalance(userTokenAccount);
    assert.equal(userTokenBalance.value.uiAmount, 1);
  });
});
