use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("AT1rUerisJ8vproAoX5ic93EGgGfBGyF1izobFuAgndN");

#[program]
pub mod solana_swap {
    use super::*;

    pub fn swap_sol_for_nft(ctx: Context<SwapSolForNFT>, price: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;

        // Ensure vault is locked
        require!(vault.locked, ErrorCode::VaultNotLocked);

        // Transfer SOL to the protocol wallet
        let protocol_wallet = &ctx.accounts.protocol_wallet;
        let authority = &ctx.accounts.authority;
        **authority.try_borrow_mut_lamports()? -= price;
        **protocol_wallet.try_borrow_mut_lamports()? += price;

        // Transfer NFT from vault to user
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let seeds = &[b"vault", vault.owner.as_ref(), &[ctx.bumps.vault]];
        let signer = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, 1)?;

        // Update vault status
        let vault = &mut ctx.accounts.vault;
        vault.locked = false;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SwapSolForNFT<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = vault.nft_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: This account is safe because it is only receiving tokens, not modifying them.
    #[account(mut)]
    pub protocol_wallet: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub nft_mint: Pubkey,
    pub locked: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The vault is not locked.")]
    VaultNotLocked,
}
