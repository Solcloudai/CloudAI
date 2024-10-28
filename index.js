import { VersionedTransaction, Connection, Keypair } from '@solana/web3.js';
import bs58 from "bs58";
import fs from 'fs';
import { Blob } from 'fetch-blob';
import 'dotenv/config';


const RPC_ENDPOINT = process.env.RPC_URL;
const web3Connection = new Connection(
    RPC_ENDPOINT,
    'confirmed',
);

async function sendLocalCreateTx(){
    const secretKeyArray = JSON.parse(process.env.PRIVATE_KEY);
    const secretKey = Uint8Array.from(secretKeyArray);
    const signerKeyPair = Keypair.fromSecretKey(secretKey);

    // Generate a random keypair for token
    const mintKeypair = Keypair.generate(); 

    const fileBuffer = await fs.readFileSync('./cloud.jpg');

    const fileBlob = new Blob([fileBuffer], { type: 'image/jpg' });

    // Define token metadata
    const formData = new FormData();
    formData.append("file", fileBlob, "cloud.jpg");
    formData.append("name", "CloudAI"),
    formData.append("symbol", "CLOUD"),
    formData.append("description", "We're putting a spin on the AI meta, combining 2 AI models to completely automated the token creation process. GPT-4o is used as control module to prompt Claude 3.5 Sonnet, giving instructions. $CLOUD is the first token launched completely uninterrupted by human prompters"),
    formData.append("twitter", "https://x.com/cloudaisol"),
    formData.append("showName", "true");

    // Create IPFS metadata storage
    const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
        method: "POST",
        body: formData,
    });
    const metadataResponseJSON = await metadataResponse. json();

    // Get the create transaction
    const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "publicKey": signerKeyPair.publicKey.toBase58(),
            "action": "create",
            "tokenMetadata": {
                name: metadataResponseJSON.metadata.name,
                symbol: metadataResponseJSON.metadata.symbol,
                uri: metadataResponseJSON.metadataUri
            },
            "mint": mintKeypair.publicKey.toBase58(),
            "denominatedInSol": "true",
            "amount": 1, // dev buy of 1 SOL
            "slippage": 15, 
            "priorityFee": 0.001,
            "pool": "pump"
        })
    });
    if(response.status === 200){ // successfully generated transaction
        const data = await response.arrayBuffer();
        const tx = VersionedTransaction.deserialize(new Uint8Array(data));
        tx.sign([mintKeypair, signerKeyPair]);
        const signature = await web3Connection.sendTransaction(tx)
        console.log("Transaction: https://solscan.io/tx/" + signature);
    } else {
        console.log(response.statusText); // log error
    }
}

sendLocalCreateTx();
