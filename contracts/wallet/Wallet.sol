// contracts/wallet/Wallet.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Wallet {
    address public owner;
    bool internal initialized;

    function initialize(address _owner) external {
        require(!initialized, "Already initialized");
        owner = _owner;
        initialized = true;
    }

    function execute(address to, uint256 value, bytes calldata data) external {
        require(msg.sender == owner, "Not owner");
        (bool success, ) = to.call{value: value}(data);
        require(success, "Execution failed");
    }

    receive() external payable {}
}