use anchor_lang::prelude::*;

declare_id!("8SR9grijMpc1kujQ8ATJHXbbkrfBgSSoGoep1LaHmv2E");

#[program]
pub mod deposit_gate {
	use super::*;

	pub fn initialize(ctx: Context<Initialize>, oracle: Pubkey) -> Result<()> {
		let gate = &mut ctx.accounts.gate;
		gate.is_open = false;
		gate.oracle = oracle;
		msg!("Deposit gate created! Current state: {}", gate.is_open);
		msg!("Oracle set: {}", gate.oracle);
		Ok(())
	}

	pub fn set_gate(ctx: Context<SetGate>, new_state: bool) -> Result<()> {
		let gate = &mut ctx.accounts.gate;
		msg!("Previous gate state: {}", gate.is_open);
		gate.is_open = new_state;
		msg!("Gate state updated! Current state: {}", gate.is_open);
		Ok(())
	}

	pub fn check_gate(_ctx: Context<CheckGate>) -> Result<()> {
		Ok(())
	}
}

#[derive(Accounts)]
pub struct Initialize<'info> {
	#[account(mut)]
	pub authority: Signer<'info>,
	#[account(
		init,
		seeds = [b"deposit_gate"],
		bump,
		payer = authority,
		space = 8 + 1 + 32 // 8 (discriminator) + 1 (bool) + 32 (Pubkey for oracle)
	)]
	pub gate: Account<'info, DepositGate>,
	pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetGate<'info> {
	#[account(mut, seeds = [b"deposit_gate"], bump, has_one = oracle)]
	pub gate: Account<'info, DepositGate>,
	pub oracle: Signer<'info>,
}

#[derive(Accounts)]
pub struct CheckGate<'info> {
	#[account(seeds = [b"deposit_gate"], bump, constraint = gate.is_open @ ErrorCode::GateClosed)]
	pub gate: Account<'info, DepositGate>,
}

#[account]
pub struct DepositGate {
	pub is_open: bool,
	pub oracle: Pubkey,
}

#[error_code]
pub enum ErrorCode {
	#[msg("The deposit gate is closed")]
	GateClosed,
}