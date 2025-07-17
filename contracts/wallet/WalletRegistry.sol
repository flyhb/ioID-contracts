// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Wallet.sol";

contract WalletRegistry {
    mapping(address => address) public userWallets;

    function deployWallet(address user) external returns (address wallet) {
        require(userWallets[user] == address(0), "Already exists");
        Wallet newWallet = new Wallet();
        newWallet.initialize(user);
        userWallets[user] = address(newWallet);
        return address(newWallet);
    }

    function getWallet(address user) external view returns (address) {
        return userWallets[user];
    }
}