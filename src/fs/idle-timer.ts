
export type IdleTimer={
    postpone():void,
    active:boolean,
};
export function idleTimer({
    min=10, max=1000, rate=2,
    handler,
}:{
    min?:number, max?:number, rate?:number,
    handler: ()=>void,
}):IdleTimer {
    const start=performance.now();
    let h:NodeJS.Timeout;
    let done=false;
    let theHandler=()=>{
        done=true;
        handler();        
    };
    let at=start+min;
    schedule(at);
    return {
        get active(){
            return !done;
        },
        postpone(){
            if (done) throw new Error("idle-timer: Already deactivated");
            const elapsed=performance.now()-start;
            let newAt=start+elapsed*rate;
            if(newAt>max) newAt=max;
            if(newAt>at){
                at=newAt;
                schedule(at);
            } 
        }
    };
    function schedule(at:number) {
        if (h!=null) clearTimeout(h);
        let delay=at-performance.now();
        if (delay<0) delay=0;
        h=setTimeout(theHandler, delay);
    } 
}
