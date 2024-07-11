const anchor = require('@project-serum/anchor');

module.exports = async function (provider) {
  // Configure the client to use the provider.
  anchor.setProvider(provider);

  // Add your deployment scripts here.
  const nftMinter = anchor.workspace.SolanaNftMinting;
  const vault = anchor.workspace.SolanaVault;
  const swap = anchor.workspace.SolanaSwap;

  console.log("Deploying Solana NFT Minting Program...");
  await nftMinter.deploy();

  console.log("Deploying Solana Vault Program...");
  await vault.deploy();

  console.log("Deploying Solana Swap Program...");
  await swap.deploy();

  console.log("Programs deployed successfully.");
};
