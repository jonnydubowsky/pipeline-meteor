import { Template } from 'meteor/templating';
import './viewByTag.html';

// We expect a ReactiveVar to be set by the parent
// Template.instance().data.contract

Template.viewByTag.onCreated(function() {
    this.viewables = new ReactiveVar([]);
});

Template.viewByTag.helpers({
    contracts: function() {
        let tag = Template.instance().data.tag.get();
        let contracts = [];
        let query = {};
        if (tag == 0) {
            query.tags = {$exists: false};
        }
        if (tag) {
            query.tags = {$in: [tag]};
        }

        Pipeline.collections.ContractSource.find(query).map(function(contract, i) {
            let deployed = Pipeline.collections.DeployedContract.findOne({contract_source_id: contract._id, chain_id: web3.version.network});
            if (deployed) {
                contract.index = i;
                contracts.push(contract);
            }
        });
        let length = contracts.length;
        Template.instance().viewables.set(new Array(length).fill(false, 0, length));

        return contracts;
    },
    viewable: function() {
        return Template.instance().viewables.get()[this.index];
    },
    popoverContent: function() {
        devdoc = JSON.parse(this.devdoc);
        let str = '';
        if (devdoc.details) {
            str += devdoc.details + '; ';
        }
        if (devdoc.author) {
            str += devdoc.author;
        }
        return str;
    },
    modaldata: function() {
        let self = this;
        let contract_deployed, contract;
        console.log(self)
        contract_deployed = Pipeline.collections.DeployedContract.findOne({contract_source_id: self._id});
        if (contract_deployed && web3.isConnected()) {
            contract = web3.eth.contract(
                JSON.parse(self.abi)
            ).at(contract_deployed.eth_address);
        }
        else {
            contract = {abi: JSON.parse(self.abi)};
        }

        let network = Pipeline.chains[web3.version.network];
        network = network.slice(0, 1).toUpperCase() + network.slice(1, network.length);

        let link_etherscan = `https://${network}.etherscan.io/address/${contract_deployed.eth_address}`

        return {
            id: 'abi_' + self._id,
            template: 'abiui',
            hiddenSave: true,
            contract,
            titleTemplate: `<label>${self.name} - deployed on ${network} - </label> <a href="${link_etherscan}" target="_blank">${link_etherscan}</a>`,
            saveAction: function() {
                let viewables = Template.instance().viewables.get();
                viewables[self.index] = false;
                Template.instance().viewables.set(viewables);
            },
            contractName: self.name,
        }
    }
});

Template.viewByTag.events({
    'click .pipe': function(event) {
        let contracts = Template.instance().data.contracts.get();
        let index = contracts.indexOf(this._id);
        if (index > -1) {
            contracts.splice(index, 1);
        } else {
            contracts.push(this._id);
        }
        Template.instance().data.contracts.set(contracts);
    },
    'click label': function(event) {
        $('[data-toggle="popover"]').popover()
        $(event.currentTarget).popover('toggle');
    },
    'mouseover label': function(event) {
        $('[data-toggle="popover"]').popover()
        $(event.currentTarget).popover('show');
    },
    'mouseout label': function(event) {
        $('[data-toggle="popover"]').popover()
        $(event.currentTarget).popover('hide');
    },
    'click .abi': function(event) {
        let self = this;
        let viewables = Template.instance().viewables.get();
        viewables[self.index] = true;
        Template.instance().viewables.set(viewables);
        setTimeout(function() {
            $('#generalModal_abi_' + self._id).modal({backdrop: false});
        }, 500);
    }
});
