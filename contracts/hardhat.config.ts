import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        "opbnb-testnet": {
            url: "https://opbnb-testnet-rpc.bnbchain.org",
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 5611,
        },
    },
    etherscan: {
        apiKey: {
            "opbnb-testnet": BSCSCAN_API_KEY,
        },
        customChains: [
            {
                network: "opbnb-testnet",
                chainId: 5611,
                urls: {
                    apiURL: "https://api-testnet-opbnb.bscscan.com/api",
                    browserURL: "https://testnet.opbnbscan.com",
                },
            },
        ],
    },
};

export default config;
