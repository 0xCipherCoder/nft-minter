use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use solana_vault::program::SolanaVault;
use solana_vault::cpi::accounts::UnlockNFT as VaultUnlockNFT;
use solana_vault::cpi::unlock_nft as vault_unlock_nft;

declare_id!("AT1rUerisJ8vproAoX5ic93EGgGfBGyF1izobFuAgndN");

#[program]
pub mod solana_swap {
    use super::*;

    pub fn swap_sol_for_nft(ctx: Context<SwapSolForNFT>, price: u64) -> Result<()> {
        // Transfer SOL to the protocol wallet
        let transfer_instruction = anchor_lang::system_program::Transfer {
            from: ctx.accounts.authority.to_account_info(),
            to: ctx.accounts.protocol_wallet.to_account_info(),
        };
        let transfer_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_instruction);
        anchor_lang::system_program::transfer(transfer_ctx, price)?;

        // Unlock the NFT via CPI to the vault program
        let cpi_program = ctx.accounts.vault_program.to_account_info();
        let cpi_accounts = VaultUnlockNFT {
            vault: ctx.accounts.vault.to_account_info(),
            nft_mint: ctx.accounts.nft_mint.to_account_info(),
            user_token_account: ctx.accounts.user_token_account.to_account_info(),
            vault_token_account: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        vault_unlock_nft(cpi_ctx)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SwapSolForNFT<'info> {
    #[account(mut)]
    pub vault: Account<'info, solana_vault::Vault>,

    pub nft_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: This account is safe because it is only receiving tokens
    #[account(mut)]
    pub protocol_wallet: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub vault_program: Program<'info, SolanaVault>,
    pub system_program: Program<'info, System>,
}