// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IERC6551Registry.sol";
import "./HBAccount.sol";

/// @dev Minimal local-only mock of an ERC-6551 registry matching your IERC6551Registry interface.
contract ERC6551RegistryMock is IERC6551Registry {
    mapping(bytes32 => address) internal _accounts;

    function account(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external view returns (address) {
        bytes32 key = keccak256(abi.encode(implementation, salt, chainId, tokenContract, tokenId));
        return _accounts[key];
    }

    function createAccount(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external returns (address) {
        bytes32 key = keccak256(abi.encode(implementation, salt, chainId, tokenContract, tokenId));
        address acc = _accounts[key];
        if (acc == address(0)) {
            // No initData in this interface; we just deploy a fresh HBAccount.
            HBAccount wallet = new HBAccount(chainId, tokenContract, tokenId);
            acc = address(wallet);
            _accounts[key] = acc;
            emit ERC6551AccountCreated(acc, implementation, salt, chainId, tokenContract, tokenId);
        }
        return acc;
    }
}
