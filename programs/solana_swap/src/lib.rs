use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer, Token};

declare_id!("AT1rUerisJ8vproAoX5ic93EGgGfBGyF1izobFuAgndN");

#[program]
mod solana_swap {
    use super::*;

    pub fn swap_sol_for_nft(ctx: Context<SwapSolForNFT>, amount: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(vault.locked, ErrorCode::NFTNotLocked);

        // Perform SOL to NFT swap
        let cpi_accounts = Transfer {
            from: ctx.accounts.payer.to_account_info(),
            to: ctx.accounts.receiver.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_context, amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SwapSolForNFT<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: This account is safe because it is only receiving tokens, not modifying them.
    #[account(mut)]
    pub receiver: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("NFT is not locked in the vault.")]
    NFTNotLocked,
}

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub nft: Pubkey,
    pub locked: bool,
}