// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC165, ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract HBAccount is ERC165, IERC1271, ERC721Holder, ERC1155Holder, ReentrancyGuard {
    uint256 private immutable _chainId;
    address private immutable _tokenContract;
    uint256 private immutable _tokenId;

    bytes4 private constant EIP1271_MAGICVALUE = 0x1626ba7e;
    bytes4 private constant EIP1271_INVALID    = 0xffffffff;

    event Executed(address indexed to, uint256 value, bytes data, bytes result);

    constructor(uint256 chainId_, address tokenContract_, uint256 tokenId_) {
        require(tokenContract_ != address(0), "token contract is zero");
        _chainId = chainId_;
        _tokenContract = tokenContract_;
        _tokenId = tokenId_;
    }

    function token() external view returns (uint256 chainId, address tokenContract, uint256 tokenId) {
        return (_chainId, _tokenContract, _tokenId);
    }

    function owner() public view returns (address) {
        return IERC721(_tokenContract).ownerOf(_tokenId);
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

    function isValidSignature(bytes32 hash, bytes memory signature)
        external
        view
        override
        returns (bytes4)
    {
        address signer = ECDSA.recover(hash, signature);
        return signer == owner() ? EIP1271_MAGICVALUE : EIP1271_INVALID;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC165, ERC1155Receiver)
        returns (bool)
    {
        return interfaceId == type(IERC1271).interfaceId || super.supportsInterface(interfaceId);
    }

    receive() external payable {}
    fallback() external payable {}
}
