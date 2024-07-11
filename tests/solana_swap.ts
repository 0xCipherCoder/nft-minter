import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaSwap } from "../target/types/solana_swap";
import { SolanaVault } from "../target/types/solana_vault";
import { SolanaNftMinting } from "../target/types/solana_nft_minting";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createMint, createAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";

describe("solana_swap", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const swapProgram = anchor.workspace.SolanaSwap as Program<SolanaSwap>;
  const vaultProgram = anchor.workspace.SolanaVault as Program<SolanaVault>;
  const mintingProgram = anchor.workspace.SolanaNftMinting as Program<SolanaNftMinting>;

  const user = anchor.web3.Keypair.generate();
  const protocolWallet = anchor.web3.Keypair.generate();
  
  let vaultPda: anchor.web3.PublicKey;
  let vaultBump: number;
  let vaultTokenAccount: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let nftMint: anchor.web3.PublicKey;
  let nftCollectionPda: anchor.web3.PublicKey;
  let nftCollectionBump: number;

  it("Initializes the test state", async () => {
    // Airdrop SOL to the user
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 2000000000)
    );

    // Derive the vault PDA
    [vaultPda, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("vault"), user.publicKey.toBuffer()],
      vaultProgram.programId
    );

    // Create NFT mint
    nftMint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      0
    );

    // Derive the associated token account addresses
    vaultTokenAccount = await getAssociatedTokenAddress(nftMint, vaultPda, true);
    userTokenAccount = await getAssociatedTokenAddress(nftMint, user.publicKey);

    // Create user token account
    await createAssociatedTokenAccount(
      provider.connection,
      user,
      nftMint,
      user.publicKey
    );

    // Mint 1 NFT to user
    await mintTo(
      provider.connection,
      user,
      nftMint,
      userTokenAccount,
      user,
      1
    );

    // Derive the nft collection PDA
    [nftCollectionPda, nftCollectionBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("nft_collection"), user.publicKey.toBuffer()],
      mintingProgram.programId
    );

    // Initialize the vault
    await vaultProgram.methods.initializeVault()
      .accounts({
        vault: vaultPda,
        authority: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Lock the NFT into the vault
    await vaultProgram.methods.lockNft(new anchor.BN(10000000))
      .accounts({
        vault: vaultPda,
        nftMint: nftMint,
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

    // Verify the NFT is locked in the vault
    const vaultAccount = await vaultProgram.account.vault.fetch(vaultPda);
    assert.isTrue(vaultAccount.locked);
  });

  it("Swaps SOL for NFT", async () => {
    // Get user's initial SOL balance
    const initialUserBalance = await provider.connection.getBalance(user.publicKey);

    // Check the vault's token balance (should be 1 initially)
    let vaultTokenBalance = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
    assert.equal(vaultTokenBalance.value.uiAmount, 1);

    // Swap SOL for NFT
    await swapProgram.methods.swapSolForNft(new anchor.BN(100000000))
      .accounts({
        vault: vaultPda,
        nftMint: nftMint,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        authority: user.publicKey,
        protocolWallet: protocolWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        vaultProgram: vaultProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
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
    vaultTokenBalance = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
    assert.equal(vaultTokenBalance.value.uiAmount, 0);

    // Check the protocol wallet's SOL balance
    const protocolWalletBalance = await provider.connection.getBalance(protocolWallet.publicKey);
    assert.equal(protocolWalletBalance, 110000000); // 10000000 (lock fee) + 100000000 (swap fee)

     // Check the user's SOL balance
     const finalUserBalance = await provider.connection.getBalance(user.publicKey);
     const expectedUserBalance = initialUserBalance - 100000000;
     assert.equal(finalUserBalance, expectedUserBalance);

     // Verify the NFT ownership by checking if it's in the user's account
    const nftAccountInfo = await provider.connection.getParsedAccountInfo(userTokenAccount);
    const nftAccountData = nftAccountInfo.value.data.parsed;
    assert.equal(nftAccountData.info.tokenAmount.amount, '1', 'User should own 1 NFT after the swap');

    // Ensure the vault's token account is empty
    const vaultTokenAccountInfo = await provider.connection.getParsedAccountInfo(vaultTokenAccount);
    const vaultTokenAccountData = vaultTokenAccountInfo.value.data.parsed;
    assert.equal(vaultTokenAccountData.info.tokenAmount.amount, '0', 'Vault token account should be empty after the swap');
  });
});