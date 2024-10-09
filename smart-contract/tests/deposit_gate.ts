import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from '@solana/web3.js';
import { expect } from 'chai';
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';

describe("deposit_gate", () => {
	const provider = anchor.AnchorProvider.env();
	anchor.setProvider(provider);
	const program = anchor.workspace.DepositGate as Program<DepositGate>;
	const recipient = new PublicKey("J6X3g8fjvbGZzZaPyy9kxUMCjeo8cJYPY7pQCneQgg1d");
	const oraclePubkey = new PublicKey("8F2TcP7cBnHmzZAKqPUjPg5gNbtiFq1QMS6KwszUCTAF");

	it("Initializes the deposit gate with oracle", async () => {
		const deployer = provider.wallet.publicKey;
		const [gatePDA] = PublicKey.findProgramAddressSync(
			[Buffer.from("deposit_gate")],
			program.programId
		);

		const tx = await program.methods
			.initialize(oraclePubkey)
			.accounts({
				authority: deployer,
				gate: gatePDA,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			.rpc();

		console.log("Transaction signature", tx);

		const gateAccount = await program.account.depositGate.fetch(gatePDA);

		expect(gateAccount.oracle.toBase58()).to.equal(oraclePubkey.toBase58());
		expect(gateAccount.isOpen).to.be.false;

		console.log("Oracle pubkey:", gateAccount.oracle.toBase58());
		console.log("Initial gate state:", gateAccount.isOpen);
	});

	it("Sets the gate state", async () => {
		const [gatePDA] = PublicKey.findProgramAddressSync(
			[Buffer.from("deposit_gate")],
			program.programId
		);

		await program.methods
			.setGate(true)
			.accounts({
				gate: gatePDA,
				oracle: provider.wallet.publicKey,
			})
			.rpc();

		const updatedGateAccount = await program.account.depositGate.fetch(gatePDA);
		expect(updatedGateAccount.isOpen).to.be.true;

		await program.methods
			.setGate(false)
			.accounts({
				gate: gatePDA,
				oracle: provider.wallet.publicKey,
			})
			.rpc();

		const closedGateAccount = await program.account.depositGate.fetch(gatePDA);
		expect(closedGateAccount.isOpen).to.be.false;
	});

	it("Checks the gate state", async () => {
		const [gatePDA] = PublicKey.findProgramAddressSync(
			[Buffer.from("deposit_gate")],
			program.programId
		);

		await program.methods
			.setGate(true)
			.accounts({
				gate: gatePDA,
				oracle: provider.wallet.publicKey,
			})
			.rpc();

		// This should succeed when the gate is open
		await program.methods
			.checkGate()
			.accounts({
				gate: gatePDA,
			})
			.rpc();

		await program.methods
			.setGate(false)
			.accounts({
				gate: gatePDA,
				oracle: provider.wallet.publicKey,
			})
			.rpc();

		// This should fail when the gate is closed
		try {
			await program.methods
				.checkGate()
				.accounts({
					gate: gatePDA,
				})
				.rpc();
			expect.fail("The transaction should have failed");
		} catch (error) {
			expect(error.message).to.include("The deposit gate is closed");
		}
	});

	it("Allows SOL transfer when gate is open", async () => {
		const [gatePDA] = PublicKey.findProgramAddressSync(
			[Buffer.from("deposit_gate")],
			program.programId
		);

		await program.methods
			.setGate(true)
			.accounts({
				gate: gatePDA,
				oracle: provider.wallet.publicKey,
			})
			.rpc();

		const transferAmount = 0.01 * LAMPORTS_PER_SOL;
		const initialBalance = await provider.connection.getBalance(recipient);

		const transaction = new Transaction().add(
			SystemProgram.transfer({
				fromPubkey: provider.wallet.publicKey,
				toPubkey: recipient,
				lamports: transferAmount,
			}),
			await program.methods.checkGate().accounts({
				gate: gatePDA,
			}).instruction()
		);

		await provider.sendAndConfirm(transaction);

		const finalBalance = await provider.connection.getBalance(recipient);
		expect(finalBalance - initialBalance).to.equal(transferAmount);
	});

	it("Prevents SOL transfer when gate is closed", async () => {
		const [gatePDA] = PublicKey.findProgramAddressSync(
			[Buffer.from("deposit_gate")],
			program.programId
		);

		await program.methods
			.setGate(false)
			.accounts({
				gate: gatePDA,
				oracle: provider.wallet.publicKey,
			})
			.rpc();

		const transferAmount = 0.01 * LAMPORTS_PER_SOL;
		const initialBalance = await provider.connection.getBalance(recipient);

		const transaction = new Transaction().add(
			SystemProgram.transfer({
				fromPubkey: provider.wallet.publicKey,
				toPubkey: recipient,
				lamports: transferAmount,
			}),
			await program.methods.checkGate().accounts({
				gate: gatePDA,
			}).instruction()
		);

		try {
			await provider.sendAndConfirm(transaction);
			expect.fail("The transaction should have failed");
		} catch (error) {
			expect(error.message).to.include("The deposit gate is closed");
		}

		const finalBalance = await provider.connection.getBalance(recipient);
		expect(finalBalance).to.equal(initialBalance);
	});

	it("Prevents non-oracle from setting gate state", async () => {
		const [gatePDA] = PublicKey.findProgramAddressSync(
			[Buffer.from("deposit_gate")],
			program.programId
		);

		// Generate a new keypair to act as a non-oracle account
		const nonOracleKeypair = anchor.web3.Keypair.generate();

		// Attempt to set the gate state with a non-oracle account
		try {
			await program.methods
				.setGate(true)
				.accounts({
					gate: gatePDA,
					oracle: nonOracleKeypair.publicKey,
				})
				.signers([nonOracleKeypair])
				.rpc();
			expect.fail("The transaction should have failed");
		} catch (error) {
			expect(error.message);
		}
	});
});