use anchor_lang::prelude::*;

declare_id!("EZSkMDXfzCmy4n7sJoesYCoacANCcJvit5R5QDJ9m5rT");

#[program]
mod solana_vault {
    use super::*;

    pub fn lock_nft(ctx: Context<LockNFT>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = *ctx.accounts.authority.key;
        vault.nft = ctx.accounts.nft.key();
        vault.locked = true;

        // Implement logic to return rent fees to the protocol

        Ok(())
    }
}

#[derive(Accounts)]
pub struct LockNFT<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 32 + 1)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub nft: Account<'info, NFT>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub nft: Pubkey,
    pub locked: bool,
}

#[account]
pub struct NFT {
    pub owner: Pubkey,
    pub metadata: String,
}