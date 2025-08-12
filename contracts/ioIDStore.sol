// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./interfaces/IProject.sol";
import "./interfaces/IioIDStore.sol";

contract ioIDStore is IioIDStore, OwnableUpgradeable {
    event SetIoIDRegistry(address indexed ioIDRegistry);
    event ChangeFeeReceiver(address indexed feeReceiver);

    address public project;
    address public override ioIDRegistry;
    uint256 public override price;
    mapping(uint256 => address) public override projectDeviceContract;
    mapping(address => uint256) public override deviceContractProject;
    mapping(uint256 => uint256) public override projectAppliedAmount;
    mapping(uint256 => uint256) public override projectActivedAmount;
    address public override feeReceiver;

    function initialize(address _project, uint256 _price) public initializer {
        __Ownable_init();

        project = _project;
        price = _price;
        ioIDRegistry = msg.sender;
        emit Initialize(_project, _price);
    }

    function applyIoIDs(uint256 _projectId, uint256 _amount) external payable override {
        require(IProject(project).projectType(_projectId) == 0, "only hardware project");
        require(msg.value >= _amount * price, "insufficient fund");
        if (feeReceiver != address(0)) {
            (bool success, ) = feeReceiver.call{value: msg.value}("");
            require(success, "collect fee fail");
        }
        unchecked {
            projectAppliedAmount[_projectId] += _amount;
        }
        emit ApplyIoIDs(_projectId, _amount);
    }

    function setDeviceContract(uint256 _projectId, address _contract) external override {
        require(IERC721(project).ownerOf(_projectId) == msg.sender, "invald project owner");
        require(projectDeviceContract[_projectId] == address(0), "project setted");
        require(deviceContractProject[_contract] == 0, "contract setted");

        projectDeviceContract[_projectId] = _contract;
        deviceContractProject[_contract] = _projectId;
        emit SetDeviceContract(_projectId, _contract);
    }

    function changeDeviceContract(uint256 _projectId, address _contract) external override onlyOwner {
        require(deviceContractProject[_contract] == 0, "contract setted");

        address _oldContract = projectDeviceContract[_projectId];
        if (_oldContract != address(0)) {
            delete deviceContractProject[_oldContract];
        }

        projectDeviceContract[_projectId] = _contract;
        deviceContractProject[_contract] = _projectId;
        emit SetDeviceContract(_projectId, _contract);
    }

    function activeIoID(uint256 _projectId) external payable override {
        require(ioIDRegistry == msg.sender, "only ioIDRegistry");

        uint256 _projectAppliedAmount = projectAppliedAmount[_projectId];
        uint256 _projectActivedAmount = projectActivedAmount[_projectId];
        if (_projectAppliedAmount == _projectActivedAmount) {
            require(msg.value >= price, "insufficient fund");
            if (feeReceiver != address(0)) {
                (bool success, ) = feeReceiver.call{value: msg.value}("");
                require(success, "collect fee fail");
            }
            unchecked {
                projectAppliedAmount[_projectId] = _projectAppliedAmount + 1;
            }
        }

        unchecked {
            projectActivedAmount[_projectId] = _projectActivedAmount + 1;
        }
        emit ActiveIoID(_projectId);
    }

    function changePrice(uint256 _price) external override onlyOwner {
        price = _price;
        emit ChangePrice(_price);
    }

    function changeFeeReceiver(address _feeReceiver) external onlyOwner {
        require(_feeReceiver != address(0), "zero address");
        feeReceiver = _feeReceiver;
        emit ChangeFeeReceiver(_feeReceiver);
    }

    function setIoIDRegistry(address _ioIDRegistry) public onlyOwner {
        require(_ioIDRegistry != address(0), "zero address");
        ioIDRegistry = _ioIDRegistry;
        emit SetIoIDRegistry(_ioIDRegistry);
    }

    function withdraw(address[] calldata _recipicents, uint256[] calldata _amounts) external onlyOwner {
        require(_recipicents.length == _amounts.length, "invalid request");

        for (uint256 i = 0; i < _recipicents.length; i++) {
            (bool success, ) = _recipicents[i].call{value: _amounts[i]}("");
            require(success, "transfer fail");
        }
    }
}
