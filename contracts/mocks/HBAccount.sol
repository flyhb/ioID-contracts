// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * Minimal ERC-6551 account implementation suitable for use with a standard 6551 registry.
 * - No constructor args (required by 6551 pattern; per-token data is handled by registry/proxy).
 * - ERC721Holder so it can receive ERC-721 via safeTransferFrom.
 * - ERC1155Receiver via ERC1155Holder.
 * - IERC1271 signature check against current owner() of the bound ERC-721 (optional usage).
 *
 * NOTE: This implementation does NOT rely on constructor-embedded token metadata.
 * If you need to persist data at creation, the registry can call `initialize(bytes)` via `initData`.
 */
contract HBAccount is ERC165, IERC1271, ERC721Holder, ERC1155Holder, ReentrancyGuard {
    // Optional persisted owner (can be set via initialize(bytes)). If unset, owner()
    // can be determined externally by your app or other logic.
    address private _explicitOwner;

    bytes4 private constant EIP1271_MAGICVALUE = 0x1626ba7e;
    bytes4 private constant EIP1271_INVALID    = 0xffffffff;

    event Executed(address indexed to, uint256 value, bytes data, bytes result);
    event OwnerSet(address indexed owner);

    constructor() {
        // parameterless as required by 6551 implementation pattern
    }

    /**
     * Optional initializer (invoked by the registry via initData on first deployment).
     * Convention: first 20 bytes of `data` are the owner to set.
     */
    function initialize(bytes calldata data) external {
        if (_explicitOwner == address(0) && data.length >= 20) {
            address newOwner;
            assembly {
                newOwner := shr(96, calldataload(data.offset))
            }
            _explicitOwner = newOwner;
            emit OwnerSet(newOwner);
        }
    }

    /**
     * Return an owner address for convenience (used by isValidSignature and executeCall guard).
     * You may adapt this to your project needs. Here we use the explicit owner if set; otherwise
     * it returns address(0). (If you want to derive ownership from a token, do it off-chain or
     * switch to a 6551 account that reads token metadata from the registry/proxy context.)
     */
    function owner() public view returns (address) {
        return _explicitOwner;
    }

    function executeCall(address to, uint256 value, bytes calldata data)
        external
        nonReentrant
        returns (bytes memory result)
    {
        require(msg.sender == owner(), "HBAccount: caller is not owner");
        (bool ok, bytes memory res) = to.call{value: value}(data);
        require(ok, "HBAccount: call failed");
        emit Executed(to, value, data, res);
        return res;
    }

    // EIP-1271 signature validation against `owner()`
    function isValidSignature(bytes32 hash, bytes memory signature)
        external
        view
        override
        returns (bytes4)
    {
        address sigOwner = owner();
        if (sigOwner == address(0)) return EIP1271_INVALID;
        address signer = ECDSA.recover(hash, signature);
        return signer == sigOwner ? EIP1271_MAGICVALUE : EIP1271_INVALID;
    }

    // ERC165
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC165, ERC1155Receiver)
        returns (bool)
    {
        return
            interfaceId == type(IERC1271).interfaceId ||
            interfaceId == 0x150b7a02 || // ERC721Receiver
            super.supportsInterface(interfaceId);
    }

    receive() external payable {}
    fallback() external payable {}
}