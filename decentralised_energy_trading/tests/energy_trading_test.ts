import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Ensure that users can register as producers with valid energy amount and price",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const producer = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'register-producer',
                [types.uint(100), types.uint(10)],
                producer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        assertEquals(block.receipts[0].result, '(ok true)');
    },
});

Clarinet.test({
    name: "Ensure that users can register as consumers",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const consumer = accounts.get('wallet_2')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'register-consumer',
                [],
                consumer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        assertEquals(block.receipts[0].result, '(ok true)');
    },
});

Clarinet.test({
    name: "Ensure that consumers can buy energy from producers with sufficient funds",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const producer = accounts.get('wallet_1')!;
        const consumer = accounts.get('wallet_2')!;

        // First register producer and consumer
        let block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'register-producer',
                [types.uint(100), types.uint(10)],
                producer.address
            ),
            Tx.contractCall(
                'energy-trading',
                'register-consumer',
                [],
                consumer.address
            )
        ]);

        // Then attempt to buy energy
        block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'buy-energy',
                [types.principal(producer.address), types.uint(50)],
                consumer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        assertEquals(block.receipts[0].result, '(ok true)');
    },
});

Clarinet.test({
    name: "Ensure that producers can update their available energy",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const producer = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'register-producer',
                [types.uint(100), types.uint(10)],
                producer.address
            )
        ]);

        block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'update-energy',
                [types.uint(50)],
                producer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        assertEquals(block.receipts[0].result, '(ok true)');
    },
});

Clarinet.test({
    name: "Ensure that only contract owner can update energy prices",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const producer = accounts.get('wallet_1')!;
        const unauthorizedUser = accounts.get('wallet_3')!;

        // Register producer first
        let block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'register-producer',
                [types.uint(100), types.uint(10)],
                producer.address
            )
        ]);

        // Attempt to update price as unauthorized user
        block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'set-energy-price',
                [types.principal(producer.address), types.uint(20)],
                unauthorizedUser.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        assertEquals(block.receipts[0].result, '(err u100)'); // err-not-owner

        // Update price as contract owner
        block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'set-energy-price',
                [types.principal(producer.address), types.uint(20)],
                deployer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 4);
        assertEquals(block.receipts[0].result, '(ok true)');
    },
});

Clarinet.test({
    name: "Ensure that energy purchase fails with insufficient energy",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const producer = accounts.get('wallet_1')!;
        const consumer = accounts.get('wallet_2')!;

        // Register producer with 100 units
        let block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'register-producer',
                [types.uint(100), types.uint(10)],
                producer.address
            ),
            Tx.contractCall(
                'energy-trading',
                'register-consumer',
                [],
                consumer.address
            )
        ]);

        // Try to buy more energy than available
        block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'buy-energy',
                [types.principal(producer.address), types.uint(150)],
                consumer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        assertEquals(block.receipts[0].result, '(err u103)'); // err-insufficient-energy
    },
});

Clarinet.test({
    name: "Ensure producers cannot register with invalid amounts",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const producer = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'register-producer',
                [types.uint(0), types.uint(10)],
                producer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        assertEquals(block.receipts[0].result, '(err u101)'); // err-invalid-amount

        block = chain.mineBlock([
            Tx.contractCall(
                'energy-trading',
                'register-producer',
                [types.uint(100), types.uint(0)],
                producer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        assertEquals(block.receipts[0].result, '(err u101)'); // err-invalid-amount
    },
});