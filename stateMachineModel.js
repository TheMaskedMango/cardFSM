class State {

    static stateList = Array();

    constructor(name,type){
        this.name = name;
        this.type = type;
    }

    static addToStateList(){
        this.stateList.push(this);
        console.log(this.stateList);
    }

}
