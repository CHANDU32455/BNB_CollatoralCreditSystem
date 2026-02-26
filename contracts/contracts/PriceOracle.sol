// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @dev Simple mock oracle for BNB Chain Hackathon to ensure stable demo.
 */
contract PriceOracle is Ownable {
    int256 private price;
    uint8 public decimals = 8;

    constructor(int256 _initialPrice) Ownable(msg.sender) {
        price = _initialPrice;
    }

    function setPrice(int256 _newPrice) external {
        price = _newPrice;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, price, block.timestamp, block.timestamp, 1);
    }
}
