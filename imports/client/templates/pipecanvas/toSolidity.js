import solidity from '../pipecodepreview/codepatterns.js';

export default class GraphsToSolidity {
    constructor(graphs) {
        this.solidity_code = '';
        this.graphs = graphs.map(function(graph, i) {
            return new GraphToSolidity(graph, i + 1);
        });
        this.ffunc = [];
        this.fffunc = [];
        this.contract_names = [];
    }

    toSolidity() {
        let self = this;
        this.solidity_code = solidity.file_p0;
        // this.solidity_code += solidity.import_p0 + solidity.import_p1;
        this.solidity_code += solidity.proxy;
        this.solidity_code += solidity.contract_p0;
        this.solidity_code += 'PipedContract';

        this.solidity_code += solidity.contract_p1;

        this.preRun();
        this.setContractAddresses();
        this.setConstructor();

        this.graphs.forEach(function(graph) {
            self.solidity_code += graph.toSolidity();
        });
        this.solidity_code += solidity.contract_p2;

        return this.solidity_code
    }

    preRun() {
        this.graphs.forEach(function(graph) {
            graph.preRun();
            // console.log('preRun', graph.funcs);
        });
    }

    getContractAddresses(graph) {
        let tm = '', code = '';
        for (let nx in graph.funcs){
            let contract_name = graph.funcs[nx].attrs[".label"].text.split(".\n")[0];

            if (this.contract_names.indexOf(contract_name) == -1) {
                this.contract_names.push(contract_name);
                code += "    address public " + contract_name + "_address;\n";
                this.ffunc.push("address _" + contract_name + "_address")
                tm = contract_name + "_address"
                this.fffunc.push(tm + " = _" + tm + ";\n    ")
            }
        }
        return code;
    }

    setContractAddresses() {
        let self = this;
        this.graphs.forEach(function(graph) {
            // console.log('setContractAddresses', graph)
            self.solidity_code += self.getContractAddresses(graph);
        });
    }

    setConstructor() {
        let code = '';
        code += "\n    constructor( address _seth_proxy, " + this.ffunc.join(", ") + ") public {\n        seth_proxy = SethProxy(_seth_proxy);\n    ";
        code += this.fffunc.join("");
        code += "\n}\n";
        this.solidity_code += code;
    }
}

class GraphToSolidity {
    constructor(graph, index) {
        this.graph = graph;
        this.index = index;
        this.solidity_code = '';
        this.run = {inPorts:[], outPorts:[], toRun:[], ready:[]};
        this.cells = [];
        this.funcs = [];
        this.inputs = [];
    }

    toSolidity(){
        // this.preRun();

        this.solidity_code += solidity.function_p0;
        this.solidity_code += 'PipedFunction' + this.index;
        this.solidity_code += solidity.function_pp0;
        // console.log(inputs)
        this.inputs.forEach((inP, ndx) => {
            if (inP.split(".")[1] == "uint256: wei_value") return;
            if (inP.split(".")[1] == "address: tx_sender") return;
            this.solidity_code += inP.split(".")[1].replace(": "," ")+", "
        })
        this.solidity_code = this.solidity_code.substring(0, this.solidity_code.length - 2);

        this.solidity_code += solidity.function_pp1;
        this.solidity_code += solidity.function_p1;
        if (this.run.outPorts.length > 0) {
            this.solidity_code += solidity.function_ret0;
            this.run.outPorts.forEach((inP, ndx) => {
                this.solidity_code += inP.split(".")[1].replace(": "," ")+", "
            })
            this.solidity_code = this.solidity_code.substring(0, this.solidity_code.length - 2);
            this.solidity_code += solidity.function_ret1
        }

        this.solidity_code += solidity.function_p2;

        let inArgs = "", outArgs="";
        for (let nx in this.funcs){
            this.forFunc(this.funcs[this.funcs.length-nx-1])
        }

        if (this.run.outPorts.length > 0) {
            this.solidity_code += "return ("
            this.run.outPorts.forEach((inP, ndx) => {
                this.solidity_code += inP.split(".")[1].replace(": "," ")+", "
            })
            this.solidity_code = this.solidity_code.substring(0, this.solidity_code.length - 2)+");\n";
        }

        this.solidity_code += solidity.function_p3;
        return this.solidity_code;
        // $('#source_textarea').val(sol);
    }

    forFunc(func){
        // console.log(func)
        let outs = [], ins = [], touts = [], tins = [], tins2=[], ttins=[]
        func.outPorts.forEach((out, dx)=>{
            outs.push(this.getIO(func.id, out, 1))
            touts.push(out)
        })
        func.inPorts.forEach((inn, dx)=>{
            let inIt = this.getIO(func.id, inn, 0);
            if (!inIt) {
                ins.push(inn.split(" ")[1])
            } else {
                ins.push(inIt)
            }
            tins.push(inn.split(": ")[0])
            tins2.push(this.getIO2(func.id, inn, 0))
            ttins.push(inn.split(": ")[1])

        })
        if (outs.length >0 ) {
            if (!outs[0]) {
                //sol = sol + "("+this.run.outPorts.join(", ").replace(": "," ")+") = ";
            } else {
                //sol = sol + "("+outs.join(", ").replace(": "," ")+") = ";
            }

        }
        // console.log(ins)
        this.solidity_code += "\n    signature42 = bytes4(keccak256(\""+func.attrs[".label"].text.split(".\n")[1]+"("+tins.join(",")+")\"));\n    input42 = abi.encodeWithSelector(signature42, "+tins2.join(",")+");\n"
        if (touts.length > 0){
            this.solidity_code += "    answer42 = ";
        }
        this.solidity_code += "    seth_proxy.proxyCallInternal";
        if (func.attrs.pipeline.abi.payable) {
            this.solidity_code += ".value(msg.value)";
        }
        this.solidity_code += "("+func.attrs[".label"].text.split(".\n")[0]+"_address , input42, 32);\n"
        touts.forEach((o,n)=>{
            this.solidity_code += '    ' + o.split(": ").join(" ")+";\n"
        })
        if (touts.length > 0){
            this.solidity_code += "    assembly {\n"
            touts.forEach((o,n)=>{
                this.solidity_code += '    ' + o.split(" ")[1]+" := mload(add(answer42, 32))\n"
            })
            this.solidity_code += "    }\n"
        }

    }

    /*getNext(edge, port){
        let next = {}
        // console.log(this.cells)
        for (let i in this.cells){
            if (this.cells[i].type == "link") {
                if (edge == this.cells[i].source.id){
                    next[this.cells[i].source.port] = this.cells[i].target
                }
            }

        }
        return next
    }*/

    getIO(node, port, io){
        let dir = "target", extra = "";
        if (io === 1) {
            dir = "source"
        }
        for (let i in this.cells){
            if (this.cells[i].type == "link") {
                if (node == this.cells[i][dir].id && port == this.cells[i][dir].port){
                    //next[this.cells[i].source.port] = this.cells[i].target
                    //console.log(this.cells[i].id)
                    if (io === 1){
                        extra = port.split(": ")[0]
                    }
                    return (extra+" e_"+this.cells[i].source.id+this.cells[i].source.port).replace(/: /g,"")
                }
            }
        }
        return false;
    }

    getIO2(node, port, io){
        let dir = "target", extra = "";
        if (io === 1) {
            dir = "source"
        }
        for (let i in this.cells){
            if (this.cells[i].type == "link") {
                if (node == this.cells[i][dir].id && port == this.cells[i][dir].port){
                    //next[this.cells[i].source.port] = this.cells[i].target
                    //console.log(this.cells[i].id)
                    if (io === 1){
                        extra = port.split(": ")[0]
                    }
                    return this.cells[i].source.port.split(": ")[1]
                }
            }
        }

        for (let ndx in this.run.inPorts){
            if (this.run.inPorts[ndx].split(".")[1] == port) {
                // console.log("hi hi ",port.split(": ")[1])
                return port.split(": ")[1]
            }
        }

        return false;
    }

    preRun() {
        let proc ={}
        this.funcs = []
        this.cells = this.graph.toJSON().cells;
        for (let i in this.cells){
            if (this.cells[i].type == "devs.Atomic" && this.cells[i].attrs.pipeline.abi.type != 'event') {
                //this.run.inPorts.push()
                this.cells[i].inPorts.forEach((inP, index) => {
                    this.run.inPorts.push(this.cells[i].id+"."+inP)
                })
                this.cells[i].outPorts.forEach((inP, index) => {
                    this.run.outPorts.push(this.cells[i].id+"."+inP)
                })
                this.run.toRun.push(this.cells[i])
            }
        }



        this.cells.forEach((cell, index) => {
            if (cell.type == "link") {
                //console.log(cell.source.id+"."+cell.source.port)
                this.run.outPorts.splice(this.run.outPorts.indexOf(cell.source.id+"."+cell.source.port), 1);
                this.run.inPorts.splice(this.run.inPorts.indexOf(cell.target.id+"."+cell.target.port), 1);
            }
        })
        this.inputs = $.extend(true, [], this.run.inPorts);
        this.process(this.run)
    }

    process(proc){
        proc.ready =[]

        proc.toRun.forEach((cell, index) => {
            proc.ready.push(cell);
            cell.outPorts.forEach((port,ndx)=> {
                if (this.run.outPorts.indexOf(cell.id+"."+port ) <0 ){
                    //console.log((cell.id+"."+port))
                    proc.ready.pop();
                }
            })

        })
        //console.log(proc)
        if (proc.ready.length == 0) return;
        // console.log(proc.ready)

        proc.ready.forEach((cell, index) => {

            proc.toRun.splice(proc.toRun.indexOf(cell), 1)
            proc.outPorts = []
            proc.toRun.forEach((rcell, ndx)=> {
                if (rcell.type == "devs.Atomic") {
                    //this.run.inPorts.push()
                    rcell.outPorts.forEach((inP, index2) => {
                        proc.outPorts.push(rcell.id+"."+inP)
                    })
                }
            })
            this.runFunc(cell)
        })
        this.process(proc)
    }

    runFunc(arg){
        //console.log(arg)
        this.funcs.push(arg)
    }
}
